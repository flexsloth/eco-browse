document.addEventListener('DOMContentLoaded', function() {
    var bg;
    var carbonPerPage = 1.76; // Average carbon per page view

    chrome.tabs.getSelected(null, function(tab) {
        bg = chrome.extension.getBackgroundPage();
        renderPage();
    });

    function formatCarbonWeight(value) {
        var suffix = "g";
        if (value >= 1000000000) {
            value = value / 1000000000;
            suffix = "mmt";
        } else if (value >= 1000000) {
            value = value / 1000000;
            suffix = "mt";
        } else if (value >= 1000) {
            value = value / 1000;
            suffix = "kg";
        }
        value = value % 1 == 0 ? value : value.toFixed(1);
        return value + suffix;
    }

    function renderPage() {
        // Check if user is logged in
        if (localStorage.getItem('loggedIn') === 'true') {
            document.querySelector('.login-form').style.display = 'none';
            document.querySelector('.signup-form').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            updateCarbonData();
        } else {
            document.querySelector('.login-form').style.display = 'block';
            document.querySelector('.signup-form').style.display = 'none';
            document.getElementById('main-content').style.display = 'none';
        }
    }

    function isValidEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function getDayCount(previous, callback) {
        chrome.runtime.sendMessage({ action: 'getDayCount', previous: previous }, function(response) {
            callback(response.count);
        });
    }

    function updateCarbonData() {
        getDayCount(0, function(todayCount) {
            var todayCarbon = todayCount * carbonPerPage;
            document.getElementById('today-carbon').innerText = formatCarbonWeight(todayCarbon);

            // Send today's carbon usage to the server
            var user = localStorage.getItem('loggedInUser');
            fetch('http://localhost:3000/update-carbon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: user, todayCarbon })
            });

            // Update forecast and other data
            var totalDays = 30; // Assuming we have data for the past 30 days
            var totalCarbon = 0;
            var daysProcessed = 0;

            for (var i = 0; i < totalDays; i++) {
                getDayCount(i, function(dayCount) {
                    totalCarbon += dayCount * carbonPerPage;
                    daysProcessed++;
                    if (daysProcessed === totalDays) {
                        var avgDailyCarbon = totalCarbon / totalDays;
                        var annualForecast = avgDailyCarbon * 365;
                        document.getElementById('forecast-count').innerText = formatCarbonWeight(annualForecast);
                    }
                });
            }
        });
    }

    // Handle login
    document.getElementById('login-button').addEventListener('click', function() {
        var username = document.getElementById('login-username').value;
        var password = document.getElementById('login-password').value;

        if (!isValidEmail(username)) {
            alert('Please enter a valid email address.');
            return;
        }

        fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Login successful') {
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('loggedInUser', username);  // Store the logged in user
                renderPage();
            } else {
                alert('Invalid credentials');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Handle logout
    document.getElementById('logout-button').addEventListener('click', function() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('loggedInUser');
        renderPage();
    });

    // Handle signup
    document.getElementById('signup-button').addEventListener('click', function() {
        var username = document.getElementById('signup-username').value;
        var password = document.getElementById('signup-password').value;

        if (!isValidEmail(username)) {
            alert('Please enter a valid email address.');
            return;
        }

        fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'User registered successfully') {
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('loggedInUser', username);  // Store the logged in user
                renderPage();
            } else {
                alert('User already exists');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Handle send report
    document.getElementById('send-report-button').addEventListener('click', function() {
        var user = localStorage.getItem('loggedInUser');
        if (!user) {
            alert('User not logged in');
            return;
        }

        fetch('http://localhost:3000/send-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: user })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Report sent successfully') {
                alert('Report sent successfully');
            } else {
                alert('Failed to send report');
            }
        })
        .catch(error => console.error('Error:', error));
    });
});
