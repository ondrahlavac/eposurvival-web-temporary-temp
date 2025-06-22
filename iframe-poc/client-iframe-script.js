document.addEventListener('DOMContentLoaded', function () {
    const iframeElement = document.querySelector('iframe');
    // listen for the message event and resize the iframe to the height of the inner content
    window.addEventListener('message', function(event) {
        if (event.data.height !== undefined) {
            iframeElement.style.height = event.data.height
        }
    });
});