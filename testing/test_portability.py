import pytest
from playwright.sync_api import sync_playwright

APP_URL = "http://localhost:3000"

@pytest.mark.parametrize("browser_type_name", ["chromium", "firefox", "webkit"])
def test_browser_portability(browser_type_name):
    """
    SRS 3.4.6: Verify the system is accessible on modern web browsers 
    (Chrome, Firefox, Edge) without requiring additional plugins.
    Note: Chromium covers Chrome and Edge. WebKit is added for versatility.
    """
    with sync_playwright() as p:
        browser_type = getattr(p, browser_type_name)
        browser = browser_type.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        print(f"Testing on {browser_type_name}...")
        try:
            response = page.goto(APP_URL, timeout=10000)
            assert response.status == 200, f"Failed to load {APP_URL} on {browser_type_name}"
        except Exception as e:
            pytest.fail(f"Could not reach {APP_URL} on {browser_type_name}. Ensure 'npm start' is running. Error: {e}")
        
        # Verify title to ensure the page rendered correctly
        assert "ConfManager" in page.title()
        
        # Verify a key UI element is present (e.g., the login form or a button)
        # Looking for the word 'Login' or similar (common in AuthModule)
        content = page.content().lower()
        assert "login" in content or "email" in content or "password" in content
        
        # Verify no 'plugin required' text is present
        assert "plugin required" not in content
        assert "install flash" not in content
        
        browser.close()

def test_no_client_installation():
    """
    SRS 3.4.6: No client-side installation shall be required; 
    the system shall function entirely via a web interface.
    """
    with sync_playwright() as p:
        browser_type = p.chromium
        browser = browser_type.launch(headless=True)
        page = browser.new_page()
        page.goto(APP_URL)
        
        # 1. Search for installer file extensions in all links
        links = page.locator("a")
        count = links.count()
        forbidden_extensions = [".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm"]
        
        for i in range(count):
            href = links.nth(i).get_attribute("href")
            if href:
                for ext in forbidden_extensions:
                    assert not href.lower().endswith(ext), f"Found forbidden client installer link: {href}"
        
        # 2. Search for explicit 'install' instructions that imply mandatory software
        body_text = page.inner_text("body").lower()
        # We allow buttons for 'Create', 'Join', etc. but flag desktop-only software triggers
        assert "download our desktop app" not in body_text
        assert "install our software to browse" not in body_text
        
        browser.close()

if __name__ == "__main__":
    pytest.main(["-v", __file__])
