package com.wheelsongo.app.ui.screens.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.ChatEvent
import com.wheelsongo.app.data.network.ChatMessage
import com.wheelsongo.app.data.network.ChatSocketClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RideChatUiState(
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val isConnected: Boolean = false,
    val currentUserId: String = ""
)

class RideChatViewModel : ViewModel() {

    private val chatClient = ChatSocketClient()
    private val _uiState = MutableStateFlow(RideChatUiState())
    val uiState: StateFlow<RideChatUiState> = _uiState.asStateFlow()

    private var rideId: String = ""

    fun initialize(rideId: String) {
        this.rideId = rideId

        // Get current user ID
        val tokenManager = ApiClient.getTokenManager()
        val userId = tokenManager.getUserId() ?: ""
        _uiState.update { it.copy(currentUserId = userId) }

        // Listen for chat events
        viewModelScope.launch {
            chatClient.events.collect { event ->
                when (event) {
                    is ChatEvent.Connected -> {
                        _uiState.update { it.copy(isConnected = event.connected) }
                        if (event.connected) {
                            chatClient.joinRoom(rideId)
                        }
                    }
                    is ChatEvent.History -> {
                        _uiState.update { it.copy(messages = event.messages) }
                    }
                    is ChatEvent.NewMessage -> {
                        _uiState.update {
                            val existing = it.messages.any { m -> m.id == event.message.id }
                            if (existing) it
                            else it.copy(messages = it.messages + event.message)
                        }
                        // Mark as read if we're the receiver
                        if (event.message.receiverId == userId) {
                            chatClient.markAsRead(rideId)
                        }
                    }
                    is ChatEvent.Error -> { /* ignore for now */ }
                }
            }
        }

        chatClient.connect()
    }

    fun onInputChange(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        if (text.isBlank() || rideId.isBlank()) return

        chatClient.sendMessage(rideId, text)
        _uiState.update { it.copy(inputText = "") }
    }

    override fun onCleared() {
        super.onCleared()
        chatClient.disconnect()
    }
}
