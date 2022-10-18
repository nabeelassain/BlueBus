const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingsModel");
const User = require("../models/usersModel");
const Bus = require("../models/busModel");
const stripe = require("stripe")(process.env.stripe_key);
const nodemailer = require("nodemailer");

//book a seat

router.post("/book-seat", authMiddleware, async (req, res) => {
  try {
    const newBooking = new Booking({
      ...req.body,
      user: req.body.userId,
    });
    await newBooking.save();
    const bus = await Bus.findById(req.body.bus);
    bus.seatsBooked = [...bus.seatsBooked, ...req.body.seats];
    await bus.save();
    res.status(200).send({
      message: "Booking successful",
      data: newBooking,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Booking failed",
      data: error,
      success: false,
    });
  }
});

// make payment

router.post("/make-payment", authMiddleware, async (req, res) => {
  try {
    const { token, amount } = req.body;
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });
    const payment = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Bus-Ticket",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/bookings",
      cancel_url: "http://localhost:3000/bookings",
    });
    if (payment) {
      const user = await User.findById(req.body.userId);
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'bluebusindia97@gmail.com',
          pass: 'yzhxxdbpwbzowhwm',
        }
      });
      var mailOptions = {
        from: 'bluebusindia97@gmail.com',
        to: user.email,
        subject: 'BlueBus Ticket Confirmed!',
        text: 'Greetings, this is to inform you that your BlueBus ticket has been confirmed.Please visit BlueBus to download the ticket.',
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
      res.status(200).send({
        message: "Payment successful",
        data: {
          transactionId: payment.id,
        },
        success: true,
      });
    } else {
      res.status(500).send({
        message: "Payment failed",
        data: error,
        success: false,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Payment failed",
      data: error,
      success: false,
    });
  }
});

// get bookings by user id
router.post("/get-bookings-by-user-id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.body.userId })
      .populate("bus") //Details are pulled from bus and user collections, since these reference are alrady given in bookingsModel
      .populate("user");
    res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookings,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Bookings fetch failed",
      data: error,
      success: false,
    });
  }
});

module.exports = router;
