package com.wheelsongo.app.ui.screens.driver

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
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

    // Refresh server-side status every time the screen comes to the foreground
    // so admin-side VERIFIED / REJECTED transitions are reflected here.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshKycStatus()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Track which document type is being picked
    var pendingDocumentType by remember { mutableStateOf<DocumentType?>(null) }

    // Track which document to preview (view uploaded image)
    var previewDocument by remember { mutableStateOf<DocumentState?>(null) }

    // File picker launcher - restricted to JPG/PNG via OpenDocument MIME whitelist
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
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
                    val launchPicker = {
                        pendingDocumentType = document.type
                        filePickerLauncher.launch(arrayOf("image/jpeg", "image/png"))
                    }
                    DocumentCard(
                        documentState = document,
                        onUpload = launchPicker,
                        onReplace = launchPicker,
                        onView = {
                            if (document.downloadUrl != null) previewDocument = document
                        },
                        onRemove = { viewModel.onRemoveDocument(document.type) },
                        onRefresh = { viewModel.refreshKycStatus() }
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

    // Document preview dialog
    if (previewDocument != null) {
        Dialog(onDismissRequest = { previewDocument = null }) {
            Card(
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Header row with title + explicit X close button.
                    // The outside-tap and bottom Close button still work;
                    // the X gives an obvious affordance that matches
                    // platform conventions for closing a modal.
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = previewDocument!!.type.title,
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { previewDocument = null }) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    AsyncImage(
                        model = previewDocument!!.downloadUrl,
                        contentDescription = previewDocument!!.type.title,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 200.dp, max = 400.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Fit
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { previewDocument = null }) {
                            Text("Close")
                        }
                    }
                }
            }
        }
    }
}

/**
 * Card for individual document upload.
 *
 * No longer whole-card clickable — each action (Upload, View, Replace,
 * Delete, Refresh) is an explicit button so users can't accidentally edit
 * a document they only wanted to view.
 */
@Composable
private fun DocumentCard(
    documentState: DocumentState,
    onUpload: () -> Unit,
    onView: () -> Unit,
    onReplace: () -> Unit,
    onRemove: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
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
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Status icon
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (documentState.isUploaded) MaterialTheme.colorScheme.primaryContainer
                            else MaterialTheme.colorScheme.surfaceVariant
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
                            documentState.downloadUnavailable -> "Uploaded · preview unavailable, tap Refresh"
                            documentState.isUploaded -> "Uploaded successfully"
                            documentState.errorMessage != null -> documentState.errorMessage
                            else -> documentState.type.description
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = when {
                            documentState.errorMessage != null -> MaterialTheme.colorScheme.error
                            documentState.downloadUnavailable -> WheelsOnGoTextSecondary
                            documentState.isUploaded -> MaterialTheme.colorScheme.primary
                            else -> WheelsOnGoTextSecondary
                        }
                    )
                }
            }

            // Action row — only rendered when there's something to do.
            // Uploading state intentionally shows no actions.
            if (!documentState.isUploading) {
                Spacer(modifier = Modifier.height(12.dp))
                DocumentActionRow(
                    documentState = documentState,
                    onUpload = onUpload,
                    onView = onView,
                    onReplace = onReplace,
                    onRemove = onRemove,
                    onRefresh = onRefresh
                )
            }
        }
    }
}

@Composable
private fun DocumentActionRow(
    documentState: DocumentState,
    onUpload: () -> Unit,
    onView: () -> Unit,
    onReplace: () -> Unit,
    onRemove: () -> Unit,
    onRefresh: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.End
    ) {
        when {
            documentState.isUploaded && documentState.downloadUnavailable -> {
                OutlinedButton(onClick = onRefresh) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Refresh")
                }
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedButton(onClick = onReplace) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Replace")
                }
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(onClick = onRemove) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            documentState.isUploaded -> {
                OutlinedButton(onClick = onView) {
                    Icon(
                        imageVector = Icons.Default.Visibility,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("View")
                }
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedButton(onClick = onReplace) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Replace")
                }
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(onClick = onRemove) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            else -> {
                // Not uploaded — may or may not carry a prior rejection
                // message. Button label shifts so the user understands this
                // is a re-upload, not a fresh slot.
                val label = if (documentState.errorMessage != null) "Re-upload" else "Upload"
                OutlinedButton(onClick = onUpload) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(label)
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
