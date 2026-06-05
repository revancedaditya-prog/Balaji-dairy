package com.example.balajimobile

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.balajimobile.theme.BalajiMobileTheme

class MainActivity : ComponentActivity() {

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    // Register activity result launcher for file chooser (for database backup JSON upload)
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        val results = if (uri != null) arrayOf(uri) else null
        fileUploadCallback?.onReceiveValue(results)
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()
        setContent {
            BalajiMobileTheme {
                Surface(
                    modifier = Modifier.fillMaxSize().statusBarsPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppWebView(
                        url = "http://192.168.1.25:5173", // Connects to host's Vite dev server on the local network
                        onFileChooser = { callback ->
                            fileUploadCallback = callback
                            fileChooserLauncher.launch("application/json")
                        }
                    )
                }
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AppWebView(
    url: String,
    onFileChooser: (ValueCallback<Array<Uri>>) -> Unit,
    modifier: Modifier = Modifier
) {
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }

    // Intercept back button to navigate back in web history instead of exiting app
    BackHandler(enabled = webViewInstance?.canGoBack() == true) {
        webViewInstance?.goBack()
    }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                webViewInstance = this
                
                // WebView client settings
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        // Open all links within the webview itself
                        url?.let { view?.loadUrl(it) }
                        return true
                    }
                }

                // WebChromeClient to support File Chooser for database restores
                webChromeClient = object : WebChromeClient() {
                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>?,
                        fileChooserParams: FileChooserParams?
                    ): Boolean {
                        filePathCallback?.let {
                            onFileChooser(it)
                            return true
                        }
                        return false
                    }
                }

                // Enable standard web features
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT

                loadUrl(url)
            }
        },
        update = { webView ->
            // Keep instance reference updated
            webViewInstance = webView
        }
    )
}
