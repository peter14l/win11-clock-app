package com.win11.clock;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        
        // Force layout behind system status bar and navigation bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | 
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | 
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
            
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
        
        // Force the WebView viewport to ignore system fitsSystemWindows settings
        // and override container margins so it stretches to absolute screen limits
        if (this.bridge != null && this.bridge.getWebView() != null) {
            View webView = this.bridge.getWebView();
            webView.setFitsSystemWindows(false);
            
            ViewGroup.LayoutParams params = webView.getLayoutParams();
            if (params instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
                marginParams.topMargin = 0;
                marginParams.bottomMargin = 0;
                webView.setLayoutParams(marginParams);
            }
        }
    }
}
