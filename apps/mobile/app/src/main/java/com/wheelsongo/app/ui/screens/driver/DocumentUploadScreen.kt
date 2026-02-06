package com.wheelsongo.app.ui.screens.driver

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.headers.TopBarWithBack
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Document upload screen for driver KYC
 * Shows list of required documents and upload status
 */
@Composable
fun DocumentUploadScreen(
    onBack: () -> Unit,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DocumentUploadViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Track which document type is being picked
    var pendingDocumentType by remember { mutableStateOf<DocumentType?>(null) }

    // File picker launcher - accepts images (JPG, PNG)
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null && pendingDocumentType != null) {
            viewModel.onDocumentSelected(pendingDocumentType!!, uri)
        }
        pendingDocumentType = null
    }

    Scaffold(
        topBar = {
            TopBarWithBack(
                title = "Document Upload",
                onBack = onBack
            )
        },
        modifier = modifier
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Progress header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Upload your documents",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "${uiState.uploadedCount}/${uiState.documents.size}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { uiState.uploadProgress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.primaryContainer
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Please upload all required documents to continue",
                    style = MaterialTheme.typography.bodySmall,
                    color = WheelsOnGoTextSecondary
                )
            }

            // Documents list
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(uiState.documents) { document ->
                    DocumentCard(
                        documentState = document,
                        onClick = {
                            pendingDocumentType = document.type
                            filePickerLauncher.launch("image/*")
                        },
                        onRemove = { viewModel.onRemoveDocument(document.type) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            // Error message
            if (uiState.submitError != null) {
                Text(
                    text = uiState.submitError!!,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                )
            }

            // Submit Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                PrimaryButton(
                    text = "Continue",
                    onClick = { viewModel.submitDocuments(onComplete) },
                    enabled = uiState.allRequiredUploaded,
                    isLoading = uiState.isSubmitting
                )
            }
        }
    }
}

/**
 * Card for individual document upload
 */
@Composable
private fun DocumentCard(
    documentState: DocumentState,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(
                enabled = !documentState.isUploading,
                onClick = onClick
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            width = 1.dp,
            color = when {
                documentState.isUploaded -> MaterialTheme.colorScheme.primary
                documentState.errorMessage != null -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.outline
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        when {
                            documentState.isUploaded -> MaterialTheme.colorScheme.primaryContainer
                            documentState.isUploading -> MaterialTheme.colorScheme.surfaceVariant
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                when {
                    documentState.isUploading -> {
                        CircularProgressIndicator(
                            progress = { documentState.uploadProgress },
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.primary,
                            strokeWidth = 2.dp
                        )
                    }
                    documentState.isUploaded -> {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Uploaded",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    else -> {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Upload",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Document info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = documentState.type.title,
                        style = MaterialTheme.typography.titleMedium
                    )
                    if (documentState.type.isRequired) {
                        Text(
                            text = " *",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = when {
                        documentState.isUploading -> "Uploading..."
                        documentState.isUploaded -> "Uploaded successfully"
                        documentState.errorMessage != null -> documentState.errorMessage
                        else -> documentState.type.description
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = when {
                        documentState.errorMessage != null -> MaterialTheme.colorScheme.error
                        documentState.isUploaded -> MaterialTheme.colorScheme.primary
                        else -> WheelsOnGoTextSecondary
                    }
                )
            }

            // Remove button (only when uploaded)
            if (documentState.isUploaded) {
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun DocumentUploadScreenPreview() {
    WheelsOnGoTheme {
        DocumentUploadScreen(
            onBack = {},
            onComplete = {}
        )
    }
}
