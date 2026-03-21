package com.wheelsongo.app.ui.screens.messaging

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.messaging.AdminMessageResponse
import com.wheelsongo.app.data.models.messaging.SendAdminMessageRequest
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminMessagesUiState(
    val messages: List<AdminMessageResponse> = emptyList(),
    val inputText: String = "",
    val isLoading: Boolean = true,
    val isSending: Boolean = false,
    val error: String? = null
)

class AdminMessagesViewModel : ViewModel() {

    private val api = ApiClient.adminMessagesApi

    private val _uiState = MutableStateFlow(AdminMessagesUiState())
    val uiState: StateFlow<AdminMessagesUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null

    init {
        fetchMessages()
        markAsRead()
        startPolling()
    }

    fun fetchMessages() {
        viewModelScope.launch {
            try {
                val response = api.getMessages()
                if (response.isSuccessful) {
                    val messages = response.body() ?: emptyList()
                    _uiState.update { it.copy(messages = messages, isLoading = false, error = null) }
                } else {
                    _uiState.update { it.copy(isLoading = false, error = "Failed to load messages") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        if (text.isEmpty()) return

        _uiState.update { it.copy(isSending = true) }
        viewModelScope.launch {
            try {
                val response = api.sendMessage(SendAdminMessageRequest(content = text))
                if (response.isSuccessful) {
                    _uiState.update { it.copy(inputText = "", isSending = false) }
                    fetchMessages()
                } else {
                    val code = response.code()
                    val errorMsg = if (code == 400) "No admin conversation found to reply to" else "Failed to send message"
                    _uiState.update { it.copy(isSending = false, error = errorMsg) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isSending = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun onInputChange(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun markAsRead() {
        viewModelScope.launch {
            try {
                api.markAsRead()
            } catch (_: Exception) { }
        }
    }

    private fun startPolling() {
        pollingJob = viewModelScope.launch {
            while (true) {
                delay(10_000)
                try {
                    val response = api.getMessages()
                    if (response.isSuccessful) {
                        val messages = response.body() ?: emptyList()
                        _uiState.update { it.copy(messages = messages) }
                        markAsRead()
                    }
                } catch (_: Exception) { }
            }
        }
    }

    override fun onCleared() {
        pollingJob?.cancel()
        super.onCleared()
    }
}
