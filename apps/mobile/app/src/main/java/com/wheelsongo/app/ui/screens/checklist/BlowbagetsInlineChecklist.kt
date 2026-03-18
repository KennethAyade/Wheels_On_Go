package com.wheelsongo.app.ui.screens.checklist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class BlowbagetsState(
    val brakes: Boolean = false,
    val lights: Boolean = false,
    val oil: Boolean = false,
    val water: Boolean = false,
    val battery: Boolean = false,
    val air: Boolean = false,
    val gas: Boolean = false,
    val engine: Boolean = false,
    val tools: Boolean = false,
    val self: Boolean = false
) {
    val allChecked: Boolean
        get() = brakes && lights && oil && water && battery && air && gas && engine && tools && self
}

@Composable
fun BlowbagetsInlineChecklist(
    isSubmitting: Boolean,
    onSubmit: (brakes: Boolean, lights: Boolean, oil: Boolean, water: Boolean,
               battery: Boolean, air: Boolean, gas: Boolean, engine: Boolean,
               tools: Boolean, self: Boolean) -> Unit
) {
    var state by remember { mutableStateOf(BlowbagetsState()) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            "Vehicle Safety Inspection",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50)
        )
        Text(
            "Inspect the rider's vehicle before starting",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        val items = listOf(
            "B" to "Brakes" to state.brakes,
            "L" to "Lights (headlights, signals)" to state.lights,
            "O" to "Oil level" to state.oil,
            "W" to "Water / Coolant" to state.water,
            "B" to "Battery" to state.battery,
            "A" to "Air (tire pressure)" to state.air,
            "G" to "Gas (fuel level)" to state.gas,
            "E" to "Engine (no leaks/sounds)" to state.engine,
            "T" to "Tools (spare, jack, triangle)" to state.tools,
            "S" to "Self (fit to drive)" to state.self
        )

        items.forEachIndexed { index, (labelPair, checked) ->
            val (letter, description) = labelPair
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = checked,
                    onCheckedChange = { newValue ->
                        state = when (index) {
                            0 -> state.copy(brakes = newValue)
                            1 -> state.copy(lights = newValue)
                            2 -> state.copy(oil = newValue)
                            3 -> state.copy(water = newValue)
                            4 -> state.copy(battery = newValue)
                            5 -> state.copy(air = newValue)
                            6 -> state.copy(gas = newValue)
                            7 -> state.copy(engine = newValue)
                            8 -> state.copy(tools = newValue)
                            9 -> state.copy(self = newValue)
                            else -> state
                        }
                    },
                    colors = CheckboxDefaults.colors(checkedColor = Color(0xFF4CAF50))
                )
                Text(
                    "$letter — $description",
                    style = MaterialTheme.typography.bodySmall,
                    fontSize = 13.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = {
                onSubmit(
                    state.brakes, state.lights, state.oil, state.water,
                    state.battery, state.air, state.gas, state.engine,
                    state.tools, state.self
                )
            },
            enabled = state.allChecked && !isSubmitting,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    if (state.allChecked) "Submit & Start Ride" else "Check all items to proceed",
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
