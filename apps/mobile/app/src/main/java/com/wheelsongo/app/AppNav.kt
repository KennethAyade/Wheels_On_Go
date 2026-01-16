package com.wheelsongo.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.wheelsongo.app.ui.screens.HomeScreen
import com.wheelsongo.app.ui.screens.LoginScreen
import com.wheelsongo.app.ui.screens.RegisterScreen

sealed class Route(val value: String) {
  data object Login : Route("login")
  data object Register : Route("register")
  data object Home : Route("home")
}

@Composable
fun AppNav(navController: NavHostController = rememberNavController()) {
  NavHost(navController = navController, startDestination = Route.Login.value) {
    composable(Route.Login.value) {
      LoginScreen(
        onLogin = { navController.navigate(Route.Home.value) },
        onGoRegister = { navController.navigate(Route.Register.value) },
      )
    }
    composable(Route.Register.value) {
      RegisterScreen(
        onRegister = { navController.navigate(Route.Home.value) },
        onGoLogin = { navController.popBackStack(Route.Login.value, false) },
      )
    }
    composable(Route.Home.value) {
      HomeScreen(onLogout = { navController.popBackStack(Route.Login.value, false) })
    }
  }
}
