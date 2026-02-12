# Wheels On Go ProGuard Rules
# Keep Moshi adapters
-keep class com.wheelsongo.app.data.models.** { *; }
# Keep Retrofit interfaces
-keep,allowobfuscation interface com.wheelsongo.app.data.network.** { *; }
