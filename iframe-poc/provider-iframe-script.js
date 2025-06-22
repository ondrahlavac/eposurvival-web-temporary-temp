document.addEventListener('DOMContentLoaded', function () {
    var lastSentScrollHeight = 0;

    // send the current scroll height of the page to its parent window.
    function sendHeightToParent( scrollHeight ) {
        if (scrollHeight !== lastSentScrollHeight) {
            const data = { height: scrollHeight };
            lastSentScrollHeight = scrollHeight; // cache
            window.parent.postMessage(data, '*');
        }
    }

    // measure minimum necessary page height by including an element
    // as the last child of the body and then getting it's offsetTop.
    function measurePageHeight() {
        const testDiv = document.createElement('div');
        testDiv.setAttribute('style', 'clear:both;'); // last element on page
        document.body.appendChild(testDiv);
        const measuredOffsetTop = testDiv.offsetTop;
        document.body.removeChild(testDiv);
        return measuredOffsetTop;
    }

    // send initial height
    sendHeightToParent(document.body.scrollHeight);

    // observe for window resize to determine the new height
    const resizeObserver = new ResizeObserver(entries => {
        sendHeightToParent(measurePageHeight());
    });
    resizeObserver.observe(document.body);
});