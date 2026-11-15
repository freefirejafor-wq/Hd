package com.cinepulse.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.cinepulse.app.network.SecurityShield
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

class CinePulseApp : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader {
        val imageClient = OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .addInterceptor { chain ->
                val orig = chain.request()
                val req = orig.newBuilder()
                    .header("User-Agent", SecurityShield.ANDROID_CHROME_UA)
                    .header("Referer", "${SecurityShield.BASE_URL}/")
                    .build()
                chain.proceed(req)
            }
            .build()

        return ImageLoader.Builder(this)
            .okHttpClient(imageClient)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(80L * 1024L * 1024L)
                    .build()
            }
            .crossfade(true)
            .build()
    }
}
