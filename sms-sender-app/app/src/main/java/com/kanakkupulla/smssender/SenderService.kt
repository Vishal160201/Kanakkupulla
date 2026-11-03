package com.kanakkupulla.smssender

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Foreground service: every POLL_MS it asks Kanakkupulla's /api/sms/outbox for pending messages,
 * sends each through the SIM, and reports the result back. No third-party service involved.
 */
class SenderService : Service() {
    private val channelId = "sms_sender"
    @Volatile private var running = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(1, buildNotification("Sending SMS for Kanakkupulla"))
        if (!running) {
            running = true
            thread(start = true) { loop() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        super.onDestroy()
    }

    private fun loop() {
        val prefs = getSharedPreferences(Prefs.NAME, Context.MODE_PRIVATE)
        while (running && prefs.getBoolean(Prefs.RUNNING, false)) {
            val base = prefs.getString(Prefs.URL, "") ?: ""
            val token = prefs.getString(Prefs.TOKEN, "") ?: ""
            if (base.isNotEmpty() && token.isNotEmpty()) {
                try {
                    val messages = fetchOutbox(base, token)
                    for (i in 0 until messages.length()) {
                        val m = messages.getJSONObject(i)
                        sendOne(base, token, m.getString("id"), m.getString("to"), m.getString("content"))
                    }
                } catch (_: Exception) {
                    // Network hiccup — try again next cycle
                }
            }
            Thread.sleep(POLL_MS)
        }
        stopSelf()
    }

    private fun fetchOutbox(base: String, token: String): JSONArray {
        val conn = (URL("$base/api/sms/outbox").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Authorization", "Bearer $token")
            connectTimeout = 15000
            readTimeout = 20000
        }
        conn.inputStream.use {
            val body = it.readBytes().toString(Charsets.UTF_8)
            return JSONObject(body).optJSONArray("messages") ?: JSONArray()
        }
    }

    private fun sendOne(base: String, token: String, id: String, to: String, content: String) {
        var ok = true
        var reason: String? = null
        try {
            val sms = smsManager()
            val parts = sms.divideMessage(content)
            if (parts.size > 1) sms.sendMultipartTextMessage(to, null, parts, null, null)
            else sms.sendTextMessage(to, null, content, null, null)
        } catch (e: Exception) {
            ok = false
            reason = e.message
        }
        report(base, token, id, ok, reason)
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) getSystemService(SmsManager::class.java)
        else SmsManager.getDefault()

    private fun report(base: String, token: String, id: String, ok: Boolean, reason: String?) {
        try {
            val conn = (URL("$base/api/sms/outbox").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 15000
                readTimeout = 20000
            }
            val payload = JSONObject().put("id", id).put("ok", ok).apply { if (reason != null) put("reason", reason) }
            conn.outputStream.use { os: OutputStream -> os.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            conn.inputStream.use { it.readBytes() }
        } catch (_: Exception) {
            // If the report fails, the server re-queues the claim after a timeout
        }
    }

    private fun buildNotification(text: String): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = getSystemService(NotificationManager::class.java)
            if (mgr.getNotificationChannel(channelId) == null) {
                mgr.createNotificationChannel(NotificationChannel(channelId, "SMS Sender", NotificationManager.IMPORTANCE_LOW))
            }
        }
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, channelId) else @Suppress("DEPRECATION") Notification.Builder(this)
        return builder
            .setContentTitle("Kanakkupulla SMS")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val POLL_MS = 20_000L
    }
}
