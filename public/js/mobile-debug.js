// Mobile Touch Detection and Debugging Tool
class MobileDebugger {
    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.debugInfo = [];
        this.init();
    }

    init() {
        this.addDebugPanel();
        this.detectCapabilities();
        this.logTouchEvents();
        this.testClickability();
    }

    detectCapabilities() {
        const capabilities = {
            touchSupport: this.isTouchDevice,
            mobileDevice: this.isMobile,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio || 1
            },
            touchPoints: navigator.maxTouchPoints || 0,
            pointerEvents: window.PointerEvent ? 'Supported' : 'Not Supported',
            touchEvents: window.TouchEvent ? 'Supported' : 'Not Supported'
        };

        this.updateDebugDisplay(capabilities);
    }

    addDebugPanel() {
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'mobile-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-height: 400px;
            overflow-y: auto;
            display: none;
        `;

        debugPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>Mobile Debug</strong>
                <button id="close-debug" style="background: none; border: none; color: white; cursor: pointer;">✕</button>
            </div>
            <div id="debug-content"></div>
            <button id="test-touch" style="margin-top: 10px; padding: 5px 10px; background: #4CAF50; border: none; color: white; cursor: pointer; border-radius: 4px;">Test Touch</button>
        `;

        document.body.appendChild(debugPanel);

        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobile-debug-toggle';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: #2196F3;
            border: none;
            color: white;
            cursor: pointer;
            border-radius: 50%;
            z-index: 9999;
            font-size: 18px;
            display: none;
        `;
        toggleBtn.innerHTML = '🔍';
        document.body.appendChild(toggleBtn);

        // Event listeners
        document.getElementById('close-debug').addEventListener('click', () => {
            debugPanel.style.display = 'none';
        });

        toggleBtn.addEventListener('click', () => {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('test-touch').addEventListener('click', () => {
            this.testTouchInteractions();
        });

        // Show toggle button on mobile
        if (this.isMobile || window.innerWidth <= 768) {
            toggleBtn.style.display = 'block';
        }
    }

    updateDebugDisplay(data) {
        const content = document.getElementById('debug-content');
        if (content) {
            content.innerHTML = `
                <div><strong>Device Info:</strong></div>
                <div>Touch Support: ${data.touchSupport ? '✅' : '❌'}</div>
                <div>Mobile Device: ${data.mobileDevice ? '✅' : '❌'}</div>
                <div>Screen: ${data.screen.width}x${data.screen.height}</div>
                <div>Viewport: ${data.viewport.width}x${data.viewport.height}</div>
                <div>Pixel Ratio: ${data.pixelRatio}</div>
                <div>Touch Points: ${data.touchPoints}</div>
                <div>Pointer Events: ${data.pointerEvents}</div>
                <div>Touch Events: ${data.touchEvents}</div>
                <div style="margin-top: 10px;"><strong>Recent Events:</strong></div>
                <div id="event-log"></div>
            `;
        }
    }

    logTouchEvents() {
        const eventTypes = ['touchstart', 'touchend', 'touchmove', 'click', 'mousedown', 'mouseup'];
        const eventLog = document.getElementById('event-log');

        eventTypes.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const timestamp = new Date().toLocaleTimeString();
                const target = e.target.tagName + (e.target.id ? '#' + e.target.id : '');
                const logEntry = `${timestamp}: ${eventType} on ${target}`;
                
                this.debugInfo.unshift(logEntry);
                if (this.debugInfo.length > 10) this.debugInfo.pop();

                if (eventLog) {
                    eventLog.innerHTML = this.debugInfo.map(log => `<div>${log}</div>`).join('');
                }
            });
        });
    }

    testTouchInteractions() {
        const testElements = document.querySelectorAll('button, .user-item, .tab-btn, .friend-request-btn');
        let testResults = [];

        testElements.forEach((element, index) => {
            if (index >= 5) return; // Test only first 5 elements

            const rect = element.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const hasTouchListener = element.ontouchstart !== null || element.onmousedown !== null;
            const computedStyle = window.getComputedStyle(element);
            const isClickable = computedStyle.pointerEvents !== 'none' && computedStyle.display !== 'none';

            testResults.push({
                element: element.tagName + (element.id ? '#' + element.id : '') + (element.className ? '.' + element.className.split(' ')[0] : ''),
                visible: isVisible,
                clickable: isClickable,
                size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
                position: `${Math.round(rect.left)},${Math.round(rect.top)}`
            });
        });

        const content = document.getElementById('debug-content');
        if (content) {
            const currentContent = content.innerHTML;
            const testHtml = `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #555;">
                    <strong>Clickability Test:</strong>
                    ${testResults.map(result => `
                        <div style="margin: 5px 0;">
                            ${result.element}: 
                            ${result.visible ? '✅' : '❌'} Visible, 
                            ${result.clickable ? '✅' : '❌'} Clickable,
                            Size: ${result.size}
                        </div>
                    `).join('')}
                </div>
            `;
            content.innerHTML = currentContent + testHtml;
        }
    }

    testClickability() {
        // Test specific problematic elements
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileOverlay');

        if (mobileMenuToggle) {
            console.log('Mobile Menu Toggle:', {
                visible: mobileMenuToggle.offsetWidth > 0 && mobileMenuToggle.offsetHeight > 0,
                clickable: window.getComputedStyle(mobileMenuToggle).pointerEvents !== 'none',
                zindex: window.getComputedStyle(mobileMenuToggle).zIndex,
                position: window.getComputedStyle(mobileMenuToggle).position
            });
        }

        if (sidebar) {
            console.log('Sidebar:', {
                transform: window.getComputedStyle(sidebar).transform,
                transition: window.getComputedStyle(sidebar).transition
            });
        }
    }
}

// Initialize mobile debugger
const mobileDebugger = new MobileDebugger();

// Export for global access
window.MobileDebugger = MobileDebugger;
