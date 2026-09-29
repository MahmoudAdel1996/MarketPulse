using Scalar.AspNetCore;

namespace MarketPulse.Api.Startup;

public static class ScalarConfigurationExtensions
{
    /// <summary>
    /// Maps the Scalar API reference UI with a "Login with Google" button injected
    /// into the page, so authenticated endpoints can be tried directly from Scalar
    /// using the resulting session cookie.
    /// </summary>
    public static WebApplication MapScalarWithGoogleLogin(this WebApplication app)
    {
        app.MapScalarApiReference(options =>
        {
            options.HeadContent = """
                <style>
                    #scalar-google-login {
                        position: fixed;
                        top: 12px;
                        right: 12px;
                        z-index: 9999;
                        background: #4285F4;
                        color: #fff;
                        padding: 8px 14px;
                        border-radius: 6px;
                        font-family: sans-serif;
                        font-size: 14px;
                        text-decoration: none;
                        box-shadow: 0 1px 4px rgba(0, 0, 0, .3);
                    }
                    #scalar-google-login:hover {
                        background: #357ae8;
                    }
                </style>
                <a id="scalar-google-login" href="#">Login with Google</a>
                <script>
                    document.addEventListener('DOMContentLoaded', function () {
                        var link = document.getElementById('scalar-google-login');
                        var returnUrl = encodeURIComponent(window.location.origin + '/scalar/v1');
                        link.href = '/api/v1/auth/google/login?returnUrl=' + returnUrl;
                    });
                </script>
                """;
        });

        return app;
    }
}
