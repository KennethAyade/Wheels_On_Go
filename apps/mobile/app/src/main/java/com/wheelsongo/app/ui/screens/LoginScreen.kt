package com.wheelsongo.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
  onLogin: () -> Unit,
  onGoRegister: () -> Unit,
) {
  Column(
    modifier = Modifier.fillMaxSize().padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(text = "Login")
    Button(onClick = onLogin, modifier = Modifier.padding(top = 16.dp)) {
      Text(text = "Continue")
    }
    Button(onClick = onGoRegister, modifier = Modifier.padding(top = 8.dp)) {
      Text(text = "Create account")
    }
  }
}
