const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Setup session handling
app.use(session({
  secret: 'your_secret_key', // Secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Connect to MongoDB
mongoose.connect('mongodb+srv://flexsloth:mCe8gyqaG512PvWu@flexsloth.nb0frkg.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  totalCarbon: { type: Number, default: 0 },
  dailyCarbon: { type: [Number], default: [] } // Store the last 30 days carbon data
});

const User = mongoose.model('User', userSchema);

// Helper function to validate email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// User login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!isValidEmail(username)) {
      return res.status(400).send({ message: 'Invalid email address' });
    }

    const user = await User.findOne({ username, password });
    if (user) {
      req.session.user = user;
      res.status(200).send({ message: 'Login successful' });
    } else {
      res.status(401).send({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// User signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!isValidEmail(username)) {
      return res.status(400).send({ message: 'Invalid email address' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send({ message: 'User already exists' });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Endpoint to update carbon data for a user
app.post('/update-carbon', async (req, res) => {
  try {
    const { username, todayCarbon } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    user.totalCarbon += todayCarbon;

    // Keep only the last 30 days of carbon data
    if (user.dailyCarbon.length >= 30) {
      user.dailyCarbon.shift();
    }
    user.dailyCarbon.push(todayCarbon);

    await user.save();
    res.status(200).send({ message: 'Carbon data updated successfully' });
  } catch (error) {
    console.error('Update carbon error:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Endpoint to send report
app.post('/send-report', async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const dailyCarbon = user.dailyCarbon[user.dailyCarbon.length - 1] || 0;
    const yearlyCarbon = user.totalCarbon;
    
    // Carbon compensation through planting trees
    const treesToPlant = Math.ceil(yearlyCarbon / 21.77); // On average, one tree absorbs 21.77 kg of CO2 annually

    // Construct the email body with relevant information
    const emailBody = `
      Hello,

      Here is your carbon emission report:

      - **Daily Carbon Release**: ${dailyCarbon.toFixed(2)}g
      - **Yearly Carbon Release**: ${yearlyCarbon.toFixed(2)}g
      - **Trees to Plant for Compensation**: ${treesToPlant} trees

      Best regards,
      Your Carbon Tracker
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'omgupta2927@gmail.com', // Your email
        pass: 'fabxwnehgtlitblr'  // Your email password
      }
    });

    const mailOptions = {
      from: 'omgupta2927@gmail.com',
      to: user.username,
      subject: 'Weekly Carbon Emission Report',
      text: emailBody
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).send({ message: 'Failed to send report' });
      } else {
        console.log('Email sent:', info.response);
        res.status(200).send({ message: 'Report sent successfully' });
      }
    });
  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
