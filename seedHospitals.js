const mongoose = require('mongoose');
const Hospital = require('./models/hospital');
require('dotenv').config();

const sampleHospitals = [
  {
    name: "Mayo Clinic",
    location: "Rochester, Minnesota"
  },
  {
    name: "Cleveland Clinic",
    location: "Cleveland, Ohio"
  },
  {
    name: "Johns Hopkins Hospital",
    location: "Baltimore, Maryland"
  },
  {
    name: "Massachusetts General Hospital",
    location: "Boston, Massachusetts"
  },
  {
    name: "Mount Sinai Hospital",
    location: "New York, New York"
  },
  {
    name: "UCLA Medical Center",
    location: "Los Angeles, California"
  },
  {
    name: "Stanford Health Care",
    location: "Stanford, California"
  },
  {
    name: "Cedars-Sinai Medical Center",
    location: "Los Angeles, California"
  },
  {
    name: "Houston Methodist Hospital",
    location: "Houston, Texas"
  },
  {
    name: "UCSF Medical Center",
    location: "San Francisco, California"
  }
];

async function seedHospitals() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zynk_appointments');
    console.log('Connected to MongoDB');
    
    // Clear existing hospitals and add fresh US hospitals
    await Hospital.deleteMany({});
    console.log('Cleared existing hospitals');
    
    // Insert sample hospitals
    await Hospital.insertMany(sampleHospitals);
    console.log('US hospitals added successfully!');
    
  } catch (error) {
    console.error('Error seeding hospitals:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedHospitals();