package com.kanakkupulla.smssender

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * Foreground service: polls Kanakkupulla's /api/sms/outbox for pending messages, sends each through
 * the SIM, waits for the SIM's real result and reports it back. No third-party service involved.
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
            var claimed = 0
            if (base.isNotEmpty() && token.isNotEmpty()) {
                try {
                    val body = fetchOutbox(base, token, deviceId(prefs))
                    val messages = body.optJSONArray("messages") ?: JSONArray()
                    prefs.edit()
                        .putBoolean(Prefs.OK, true)
                        .putLong(Prefs.LAST_AT, System.currentTimeMillis())
                        .remove(Prefs.LAST)
                        .putString(Prefs.QUEUE, (body.optJSONArray("recent") ?: JSONArray()).toString())
                        .apply()
                    claimed = messages.length()
                    for (i in 0 until claimed) {
                        val m = messages.getJSONObject(i)
                        sendOne(prefs, base, token, m.getString("id"), m.getString("to"), m.getString("content"))
                    }
                } catch (e: Exception) {
                    // Show the problem and try again next cycle
                    prefs.edit().putBoolean(Prefs.OK, false).putString(Prefs.LAST, e.message ?: "Can't reach Kanakkupulla").apply()
                }
            }
            // After sending, poll again right away: drains a backlog and refreshes the queue's statuses
            if (claimed == 0) Thread.sleep(POLL_MS)
        }
        stopSelf()
    }

    private fun open(base: String, token: String, deviceId: String) =
        (URL("$base/api/sms/outbox").openConnection() as HttpURLConnection).apply {
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("X-Device-Id", deviceId)
            connectTimeout = 15000
            readTimeout = 20000
        }

    private fun fetchOutbox(base: String, token: String, deviceId: String): JSONObject {
        val conn = open(base, token, deviceId)
        when (conn.responseCode) {
            200 -> {}
            401 -> throw Exception("Pairing token rejected. Pair the phone again.")
            409 -> throw Exception("Another phone is already connected. Re-pair in Kanakkupulla to use this one.")
            else -> throw Exception("Kanakkupulla returned HTTP ${conn.responseCode}")
        }
        conn.inputStream.use { return JSONObject(it.readBytes().toString(Charsets.UTF_8)) }
    }

    private fun sendOne(prefs: SharedPreferences, base: String, token: String, id: String, to: String, content: String) {
        val reason = try { sendViaSim(to, content) } catch (e: Exception) { e.message ?: "Send failed" }
        if (reason == null) prefs.edit().putInt(Prefs.SENT, prefs.getInt(Prefs.SENT, 0) + 1).apply()
        report(base, token, deviceId(prefs), id, reason == null, reason)
    }

    /** Sends through the SIM and waits for the radio's result. Returns null when sent, else the reason. */
    private fun sendViaSim(to: String, content: String): String? {
        val sms = smsManager()
        val parts = sms.divideMessage(content)
        val action = "$packageName.SMS_SENT.${UUID.randomUUID()}"
        val latch = CountDownLatch(parts.size)
        var failure: String? = null
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (resultCode != Activity.RESULT_OK && failure == null) failure = sendError(resultCode)
                latch.countDown()
            }
        }
        ContextCompat.registerReceiver(this, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)
        try {
            val sent = ArrayList(parts.indices.map {
                PendingIntent.getBroadcast(this, it, Intent(action).setPackage(packageName), PendingIntent.FLAG_IMMUTABLE)
            })
            if (parts.size > 1) sms.sendMultipartTextMessage(to, null, parts, sent, null)
            else sms.sendTextMessage(to, null, content, sent[0], null)
            if (!latch.await(SEND_TIMEOUT_S, TimeUnit.SECONDS)) return "No response from the SIM"
            return failure
        } finally {
            unregisterReceiver(receiver)
        }
    }

    private fun sendError(code: Int) = when (code) {
        SmsManager.RESULT_ERROR_RADIO_OFF -> "Phone radio is off (airplane mode?)"
        SmsManager.RESULT_ERROR_NO_SERVICE -> "No mobile signal"
        SmsManager.RESULT_ERROR_NULL_PDU -> "Message could not be encoded"
        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "SIM refused the SMS (balance or SIM issue?)"
        else -> "SMS failed (code $code)"
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) getSystemService(SmsManager::class.java)
        else SmsManager.getDefault()

    private fun report(base: String, token: String, deviceId: String, id: String, ok: Boolean, reason: String?) {
        try {
            val conn = open(base, token, deviceId).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }
            val payload = JSONObject().put("id", id).put("ok", ok).apply { if (reason != null) put("reason", reason.take(200)) }
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
        private const val SEND_TIMEOUT_S = 60L

        /** This install's id; the server binds the pairing token to it so only one phone can send. */
        fun deviceId(prefs: SharedPreferences): String =
            prefs.getString(Prefs.DEVICE_ID, null) ?: UUID.randomUUID().toString().also {
                prefs.edit().putString(Prefs.DEVICE_ID, it).apply()
            }
    }
}
