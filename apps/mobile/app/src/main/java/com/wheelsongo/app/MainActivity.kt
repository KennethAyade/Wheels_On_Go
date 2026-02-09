package com.wheelsongo.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.fragment.app.FragmentActivity
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

class MainActivity : FragmentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      WheelsOnGoTheme {
        AppNav()
      }
    }
  }
}
