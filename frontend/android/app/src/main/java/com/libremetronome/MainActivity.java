package com.libremetronome;

import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // A crashed or killed WebView renderer must not take the whole app down.
        // The metronome UI is reloaded instead, settings live in localStorage.
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                view.post(view::reload);
                return true;
            }
        });
    }
}
