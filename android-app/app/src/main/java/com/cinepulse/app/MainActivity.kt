package com.cinepulse.app

import android.app.PictureInPictureParams
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cinepulse.app.data.CinePulseCatalogData
import com.cinepulse.app.ui.CinePulseViewModel
import com.cinepulse.app.ui.MainTab
import com.cinepulse.app.ui.components.WebsiteBottomNavBar
import com.cinepulse.app.ui.components.WebsiteHomeHeader
import com.cinepulse.app.ui.screens.*
import com.cinepulse.app.ui.theme.CineColors
import com.cinepulse.app.ui.theme.CinePulseTheme

class MainActivity : ComponentActivity() {
    private var canEnterPipState by mutableStateOf(false)
    private var inPipModeState by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        addOnPictureInPictureModeChangedListener { info ->
            inPipModeState = info.isInPictureInPictureMode
        }
        setContent {
            CinePulseTheme {
                val vm: CinePulseViewModel = viewModel()
                CinePulseRoot(
                    vm = vm,
                    isInPipMode = inPipModeState,
                    onPipEligibilityChanged = { eligible ->
                        canEnterPipState = eligible
                    },
                    onRequestEnterPip = {
                        triggerPipMode()
                    }
                )
            }
        }
    }

    private fun triggerPipMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            runCatching {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (canEnterPipState) {
            triggerPipMode()
        }
    }
}

@Composable
private fun CinePulseRoot(
    vm: CinePulseViewModel,
    isInPipMode: Boolean,
    onPipEligibilityChanged: (Boolean) -> Unit,
    onRequestEnterPip: () -> Unit
) {
    val activeMovie = vm.selectedMovie
    val spotlightPoster = vm.homePayload.banners.firstOrNull()?.poster
        ?: vm.rawCatalogItems.firstOrNull()?.poster
        ?: ""

    BackHandler(
        enabled = activeMovie != null ||
            vm.showRequestModal ||
            vm.isSearchActive ||
            vm.activeTab != MainTab.HOME_BROWSE ||
            vm.currentCategory.path != "/"
    ) {
        when {
            activeMovie != null -> vm.closeMovie()
            vm.showRequestModal -> vm.showRequestModal = false
            vm.isSearchActive -> vm.closeSearchMode()
            vm.activeTab != MainTab.HOME_BROWSE -> vm.activeTab = MainTab.HOME_BROWSE
            vm.currentCategory.path != "/" -> vm.selectCategory(CinePulseCatalogData.ALL_CATEGORIES.first())
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = CineColors.Background
    ) {
        if (activeMovie != null) {
            PlayerDetailScreen(
                movie = activeMovie,
                vm = vm,
                isInPipMode = isInPipMode,
                onPipEligibilityChanged = onPipEligibilityChanged,
                onRequestEnterPip = onRequestEnterPip,
                onClose = {
                    onPipEligibilityChanged(false)
                    vm.closeMovie()
                }
            )
        } else {
            Box(modifier = Modifier.fillMaxSize()) {
                Scaffold(
                    containerColor = CineColors.Background,
                    topBar = {
                        if (vm.activeTab != MainTab.ME) {
                            WebsiteHomeHeader(vm)
                        }
                    },
                    bottomBar = {
                        WebsiteBottomNavBar(
                            activeTab = vm.activeTab,
                            currentCategoryPath = vm.currentCategory.path,
                            spotlightPoster = spotlightPoster,
                            onSelectHome = {
                                vm.selectCategory(CinePulseCatalogData.ALL_CATEGORIES.first())
                            },
                            onSelectExplore = {
                                vm.isSearchActive = false
                                vm.activeTab = MainTab.EXPLORE
                            },
                            onSelect18PlusHub = {
                                vm.selectCategoryByPath("/adult18plus")
                            },
                            onSelectDownloads = {
                                vm.isSearchActive = false
                                vm.activeTab = MainTab.DOWNLOADS
                            },
                            onSelectMe = {
                                vm.isSearchActive = false
                                vm.activeTab = MainTab.ME
                            }
                        )
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (vm.activeTab) {
                            MainTab.HOME_BROWSE -> WebsiteBrowseScreen(vm)
                            MainTab.EXPLORE -> WebsiteExploreScreen(vm)
                            MainTab.DOWNLOADS -> WebsiteDownloadsScreen(vm)
                            MainTab.ME -> WebsiteMeScreen(vm)
                        }
                    }
                }

                if (vm.showRequestModal) {
                    Last24hAndRequestModal(vm)
                }
            }
        }
    }
}
