package com.wheelsongo.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      WheelsOnGoTheme {
        AppNav()
      }
    }
  }
}
