(async () => {

    const monitoredDomain = "web.whatsapp.com";

    if (!location.href.includes(monitoredDomain)) {
        return;
    }

    const payload = {
        url: location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };

    try {

        await fetch("https://ntfy.sh/mychromealerts", {

            method: "POST",

            headers: {
                "Title": "WhatsApp Web Opened",
                "Priority": "5",
                "Tags": "warning"
            },

            body: JSON.stringify(payload, null, 2)
        });

        console.log("ntfy alert sent");

    } catch (err) {

        console.error(err);
    }

})();