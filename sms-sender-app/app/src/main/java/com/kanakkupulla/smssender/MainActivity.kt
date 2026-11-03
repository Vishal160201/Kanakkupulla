package com.kanakkupulla.smssender

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences(Prefs.NAME, Context.MODE_PRIVATE)
        val urlInput = findViewById<EditText>(R.id.urlInput)
        val tokenInput = findViewById<EditText>(R.id.tokenInput)
        val status = findViewById<TextView>(R.id.statusText)

        urlInput.setText(prefs.getString(Prefs.URL, ""))
        tokenInput.setText(prefs.getString(Prefs.TOKEN, ""))
        status.text = if (prefs.getBoolean(Prefs.RUNNING, false)) "Running" else "Stopped"

        requestPermissions()

        fun saveAndStart(rawUrl: String, rawToken: String) {
            val url = rawUrl.trim().trimEnd('/')
            val token = rawToken.trim()
            if (!url.startsWith("http") || !token.startsWith("kst_")) {
                Toast.makeText(this, "Enter the address and a kst_ token", Toast.LENGTH_LONG).show()
                return
            }
            urlInput.setText(url)
            tokenInput.setText(token)
            prefs.edit().putString(Prefs.URL, url).putString(Prefs.TOKEN, token).putBoolean(Prefs.RUNNING, true).apply()
            ContextCompat.startForegroundService(this, Intent(this, SenderService::class.java))
            status.text = "Running"
            Toast.makeText(this, "Connected and started", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.startButton).setOnClickListener {
            saveAndStart(urlInput.text.toString(), tokenInput.text.toString())
        }

        findViewById<Button>(R.id.scanButton).setOnClickListener {
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

        findViewById<Button>(R.id.stopButton).setOnClickListener {
            prefs.edit().putBoolean(Prefs.RUNNING, false).apply()
            stopService(Intent(this, SenderService::class.java))
            status.text = "Stopped"
        }
    }

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
}
