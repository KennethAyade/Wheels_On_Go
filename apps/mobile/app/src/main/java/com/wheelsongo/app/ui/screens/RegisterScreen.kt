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
fun RegisterScreen(
  onRegister: () -> Unit,
  onGoLogin: () -> Unit,
) {
  Column(
    modifier = Modifier.fillMaxSize().padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(text = "Register")
    Button(onClick = onRegister, modifier = Modifier.padding(top = 16.dp)) {
      Text(text = "Create account")
    }
    Button(onClick = onGoLogin, modifier = Modifier.padding(top = 8.dp)) {
      Text(text = "Back to login")
    }
  }
}
