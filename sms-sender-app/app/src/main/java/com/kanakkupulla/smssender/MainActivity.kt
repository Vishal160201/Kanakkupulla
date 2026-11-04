package com.kanakkupulla.smssender

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import org.json.JSONArray
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainActivity : AppCompatActivity() {
    // Held as a field: SharedPreferences keeps listeners weakly
    private var prefsListener: SharedPreferences.OnSharedPreferenceChangeListener? = null
    private lateinit var prefs: SharedPreferences
    private var reconfiguring = false
    private var detailsOpen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(Prefs.NAME, Context.MODE_PRIVATE)
        val urlInput = findViewById<EditText>(R.id.urlInput)
        val tokenInput = findViewById<EditText>(R.id.tokenInput)
        urlInput.setText(prefs.getString(Prefs.URL, ""))
        tokenInput.setText(prefs.getString(Prefs.TOKEN, ""))

        requestPermissions()
        render()
        prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> render() }
        prefs.registerOnSharedPreferenceChangeListener(prefsListener)

        // Revive the service if it was killed (app update, battery saver) while it should be running
        if (prefs.getBoolean(Prefs.RUNNING, false)) ContextCompat.startForegroundService(this, Intent(this, SenderService::class.java))

        fun saveAndStart(rawUrl: String, rawToken: String) {
            val url = rawUrl.trim().trimEnd('/')
            val token = rawToken.trim()
            if (!url.startsWith("http") || !token.startsWith("kst_")) {
                Toast.makeText(this, "Enter the address and a kst_ token", Toast.LENGTH_LONG).show()
                return
            }
            urlInput.setText(url)
            tokenInput.setText(token)
            val edit = prefs.edit().putString(Prefs.URL, url).putString(Prefs.TOKEN, token).putBoolean(Prefs.RUNNING, true)
            if (token != prefs.getString(Prefs.TOKEN, null)) edit.remove(Prefs.LAST).remove(Prefs.OK).remove(Prefs.QUEUE)
            reconfiguring = false
            edit.apply()
            ContextCompat.startForegroundService(this, Intent(this, SenderService::class.java))
            render()
            Toast.makeText(this, "Saved. Connecting…", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.startButton).setOnClickListener {
            saveAndStart(urlInput.text.toString(), tokenInput.text.toString())
        }

        findViewById<View>(R.id.scanButton).setOnClickListener {
            val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
            GmsBarcodeScanning.getClient(this, options).startScan()
                .addOnSuccessListener { code ->
                    // Kanakkupulla's QR: kanakkupulla://pair?url=<site>&token=<kst_…>
                    val uri = Uri.parse(code.rawValue ?: "")
                    if (uri.scheme != "kanakkupulla" || uri.host != "pair") {
                        Toast.makeText(this, "Not a Kanakkupulla pairing QR", Toast.LENGTH_LONG).show()
                    } else {
                        saveAndStart(uri.getQueryParameter("url") ?: "", uri.getQueryParameter("token") ?: "")
                    }
                }
                .addOnFailureListener { Toast.makeText(this, "Scanner unavailable: ${it.message}", Toast.LENGTH_LONG).show() }
        }

        findViewById<View>(R.id.statusCard).setOnClickListener {
            detailsOpen = !detailsOpen
            render()
        }

        findViewById<Button>(R.id.reconfigureButton).setOnClickListener {
            reconfiguring = true
            render()
        }

        findViewById<Button>(R.id.cancelButton).setOnClickListener {
            urlInput.setText(prefs.getString(Prefs.URL, ""))
            tokenInput.setText(prefs.getString(Prefs.TOKEN, ""))
            reconfiguring = false
            render()
        }

        // Stop when running, Start again when stopped
        findViewById<Button>(R.id.stopButton).setOnClickListener {
            if (prefs.getBoolean(Prefs.RUNNING, false)) {
                prefs.edit().putBoolean(Prefs.RUNNING, false).apply()
                stopService(Intent(this, SenderService::class.java))
            } else {
                saveAndStart(prefs.getString(Prefs.URL, "") ?: "", prefs.getString(Prefs.TOKEN, "") ?: "")
            }
        }
    }

    override fun onDestroy() {
        prefs.unregisterOnSharedPreferenceChangeListener(prefsListener)
        super.onDestroy()
    }

    private fun render() {
        val configured = !prefs.getString(Prefs.TOKEN, null).isNullOrEmpty()
        val setup = !configured || reconfiguring
        findViewById<View>(R.id.setupGroup).visibility = if (setup) View.VISIBLE else View.GONE
        findViewById<View>(R.id.connectedGroup).visibility = if (setup) View.GONE else View.VISIBLE
        findViewById<View>(R.id.cancelButton).visibility = if (configured) View.VISIBLE else View.GONE
        if (setup) return

        val running = prefs.getBoolean(Prefs.RUNNING, false)
        val ok = prefs.getBoolean(Prefs.OK, false)
        val problem = prefs.getString(Prefs.LAST, null)
        val (label, color) = when {
            !running -> "Stopped" to R.color.idle
            ok -> "Connected" to R.color.ok
            problem == null -> "Connecting…" to R.color.warn
            else -> "Not connected" to R.color.danger
        }
        findViewById<TextView>(R.id.statusText).text = label
        findViewById<View>(R.id.statusDot).backgroundTintList = ColorStateList.valueOf(getColor(color))
        findViewById<ImageView>(R.id.statusChevron).rotation = if (detailsOpen) 180f else 0f

        val lastAt = prefs.getLong(Prefs.LAST_AT, 0)
        val details = buildList {
            if (running && !ok && problem != null) add(problem)
            add("Address: ${prefs.getString(Prefs.URL, "")}")
            add("Last check: " + if (lastAt > 0) DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(lastAt)) else "not yet")
            add("Sent from this phone: ${prefs.getInt(Prefs.SENT, 0)}")
            add("Phone ID: ${SenderService.deviceId(prefs).take(8)}")
        }
        // Collapsed still shows the problem, so "Not connected" always says why
        val collapsedText = if (running && !ok) problem else null
        findViewById<TextView>(R.id.statusDetail).apply {
            text = if (detailsOpen) details.joinToString("\n") else collapsedText
            visibility = if (detailsOpen || collapsedText != null) View.VISIBLE else View.GONE
        }

        findViewById<Button>(R.id.stopButton).apply {
            text = if (running) "Stop" else "Start"
            setTextColor(getColor(if (running) R.color.danger else R.color.accent))
        }
        renderQueue()
    }

    private fun renderQueue() {
        val list = findViewById<LinearLayout>(R.id.queueList)
        list.removeAllViews()
        val items = try { JSONArray(prefs.getString(Prefs.QUEUE, "[]")) } catch (_: Exception) { JSONArray() }
        if (items.length() == 0) {
            list.addView(TextView(this).apply {
                text = "No messages yet. SMS you send from Kanakkupulla appear here."
                textSize = 14f
                setTextColor(getColor(R.color.secondary))
                val pad = (16 * resources.displayMetrics.density).toInt()
                setPadding(pad, pad, pad, pad)
            })
            return
        }
        for (i in 0 until items.length()) {
            val m = items.getJSONObject(i)
            if (i > 0) list.addView(View(this).apply {
                setBackgroundColor(getColor(R.color.separator))
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1).apply {
                    marginStart = (16 * resources.displayMetrics.density).toInt()
                }
            })
            val row = layoutInflater.inflate(R.layout.item_message, list, false)
            val (status, color) = when (m.optString("status")) {
                "sent" -> "Sent" to R.color.ok
                "failed" -> "Failed" to R.color.danger
                "sending" -> "Sending" to R.color.warn
                else -> "Queued" to R.color.warn
            }
            row.findViewById<TextView>(R.id.msgTo).text = "${m.optString("to")}  ·  ${shortTime(m.optString("createdAt"))}"
            row.findViewById<TextView>(R.id.msgStatus).apply { text = status; setTextColor(getColor(color)) }
            row.findViewById<TextView>(R.id.msgText).text = m.optString("content")
            val reason = m.optString("reason").takeIf { it.isNotEmpty() && it != "null" && m.optString("status") == "failed" }
            row.findViewById<TextView>(R.id.msgReason).apply {
                visibility = if (reason != null) View.VISIBLE else View.GONE
                text = reason
            }
            list.addView(row)
        }
    }

    /** "2026-11-04T10:15:30.123Z" → local "4 Nov, 3:45 PM"; blank when unparseable. */
    private fun shortTime(iso: String): String = try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        SimpleDateFormat("d MMM, h:mm a", Locale.getDefault()).format(parser.parse(iso)!!)
    } catch (_: Exception) { "" }

    private fun requestPermissions() {
        val needed = mutableListOf(Manifest.permission.SEND_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) needed.add(Manifest.permission.POST_NOTIFICATIONS)
        val ask = needed.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (ask.isNotEmpty()) ActivityCompat.requestPermissions(this, ask.toTypedArray(), 1)
    }
}

object Prefs {
    const val NAME = "sms_sender"
    const val URL = "url"
    const val TOKEN = "token"
    const val RUNNING = "running"
    /** Last poll's problem (absent when the last poll succeeded) */
    const val LAST = "last_poll"
    const val OK = "last_ok"
    const val LAST_AT = "last_ok_at"
    const val SENT = "sent_count"
    /** Recent outbox from the server, as a JSON array */
    const val QUEUE = "queue"
    const val DEVICE_ID = "device_id"
}
