package com.wheelsongo.app.ui.screens.driver

import android.app.Application
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DriverApi
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkObject
import io.mockk.unmockkAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DocumentUploadViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var application: Application
    private lateinit var driverApi: DriverApi

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        application = mockk(relaxed = true)
        driverApi = mockk(relaxed = true)

        // Mock the ApiClient singleton to avoid initialization errors
        mockkObject(ApiClient)
        every { ApiClient.driverApi } returns driverApi
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    @Test
    fun `initial state has 3 required documents`() {
        val viewModel = DocumentUploadViewModel(application)
        val state = viewModel.uiState.value
        assertEquals(3, state.documents.size)
    }

    @Test
    fun `initial state documents are all not uploaded`() {
        val viewModel = DocumentUploadViewModel(application)
        val state = viewModel.uiState.value
        assertTrue(state.documents.all { !it.isUploaded })
    }

    @Test
    fun `initial state has no submit error`() {
        val viewModel = DocumentUploadViewModel(application)
        assertNull(viewModel.uiState.value.submitError)
    }

    @Test
    fun `initial state is not submitting`() {
        val viewModel = DocumentUploadViewModel(application)
        assertFalse(viewModel.uiState.value.isSubmitting)
    }

    @Test
    fun `documents contain required types`() {
        val viewModel = DocumentUploadViewModel(application)
        val types = viewModel.uiState.value.documents.map { it.type }
        assertTrue(types.contains(DocumentType.LICENSE))
        assertTrue(types.contains(DocumentType.GOVERNMENT_ID))
        assertTrue(types.contains(DocumentType.PROFILE_PHOTO))
    }

    @Test
    fun `onRemoveDocument clears document state`() {
        val viewModel = DocumentUploadViewModel(application)
        viewModel.onRemoveDocument(DocumentType.LICENSE)
        val doc = viewModel.uiState.value.documents.find { it.type == DocumentType.LICENSE }
        assertNotNull(doc)
        assertFalse(doc!!.isUploaded)
        assertNull(doc.fileUri)
        assertNull(doc.errorMessage)
    }

    @Test
    fun `allRequiredUploaded returns false when none uploaded`() {
        val viewModel = DocumentUploadViewModel(application)
        assertFalse(viewModel.uiState.value.allRequiredUploaded)
    }

    @Test
    fun `uploadProgress starts at zero`() {
        val viewModel = DocumentUploadViewModel(application)
        assertEquals(0f, viewModel.uiState.value.uploadProgress)
    }
}
