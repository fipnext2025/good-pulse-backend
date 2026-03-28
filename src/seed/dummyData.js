require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Submission = require('../models/Submission');
const LiveStream = require('../models/LiveStream');

const connectDB = require('../config/db');

const DUMMY_USERS = [
  { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919876543210', isRegistered: true, karmaPoints: 450, totalSubmissions: 12, approvedSubmissions: 10, location: { area: 'Jubilee Hills', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: { latitude: 17.385, longitude: 78.4867 } } },
  { name: 'Priya Patel', email: 'priya@example.com', phone: '+919876543211', isRegistered: true, karmaPoints: 380, totalSubmissions: 10, approvedSubmissions: 8, location: { area: 'Andheri', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', country: 'India', coordinates: { latitude: 19.076, longitude: 72.8777 } } },
  { name: 'Arjun Reddy', email: 'arjun@example.com', phone: '+919876543212', isRegistered: true, karmaPoints: 320, totalSubmissions: 9, approvedSubmissions: 7, location: { area: 'Banjara Hills', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: { latitude: 17.4065, longitude: 78.4772 } } },
  { name: 'Sneha Gupta', email: 'sneha@example.com', phone: '+919876543213', isRegistered: true, karmaPoints: 290, totalSubmissions: 8, approvedSubmissions: 6, location: { area: 'Koramangala', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', country: 'India', coordinates: { latitude: 12.9716, longitude: 77.5946 } } },
  { name: 'Vikram Singh', email: 'vikram@example.com', phone: '+919876543214', isRegistered: true, karmaPoints: 250, totalSubmissions: 7, approvedSubmissions: 5, location: { area: 'Connaught Place', city: 'Delhi', district: 'New Delhi', state: 'Delhi', country: 'India', coordinates: { latitude: 28.7041, longitude: 77.1025 } } },
  { name: 'Ananya Iyer', email: 'ananya@example.com', phone: '+919876543215', isRegistered: true, karmaPoints: 210, totalSubmissions: 6, approvedSubmissions: 5, location: { area: 'T Nagar', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', country: 'India', coordinates: { latitude: 13.0827, longitude: 80.2707 } } },
  { name: 'Karthik Nair', email: 'karthik@example.com', phone: '+919876543216', isRegistered: true, karmaPoints: 180, totalSubmissions: 5, approvedSubmissions: 4, location: { area: 'Fort Kochi', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', country: 'India', coordinates: { latitude: 9.9312, longitude: 76.2673 } } },
  { name: 'Meera Joshi', email: 'meera@example.com', phone: '+919876543217', isRegistered: true, karmaPoints: 150, totalSubmissions: 5, approvedSubmissions: 3, location: { area: 'Kothrud', city: 'Pune', district: 'Pune', state: 'Maharashtra', country: 'India', coordinates: { latitude: 18.5204, longitude: 73.8567 } } },
  { name: 'Rohan Das', email: 'rohan@example.com', phone: '+919876543218', isRegistered: true, karmaPoints: 120, totalSubmissions: 4, approvedSubmissions: 3, location: { area: 'Salt Lake', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', country: 'India', coordinates: { latitude: 22.5726, longitude: 88.3639 } } },
  { name: 'Divya Menon', email: 'divya@example.com', phone: '+919876543219', isRegistered: true, karmaPoints: 90, totalSubmissions: 3, approvedSubmissions: 2, location: { area: 'Madhapur', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: { latitude: 17.44, longitude: 78.35 } } },
];

const SUBMISSION_TEMPLATES = [
  { title: 'Helped elderly cross the road', description: 'Helped an elderly woman cross the busy road near Jubilee Hills. She was struggling with heavy bags.', city: 'Hyderabad', region: 'Telangana', type: 'deed' },
  { title: 'Cleaned up local park', description: 'Organized a cleanup drive at KBR National Park. Collected 3 bags of trash with volunteers.', city: 'Hyderabad', region: 'Telangana', type: 'deed' },
  { title: 'Donated food to shelter', description: 'Prepared and donated 50 meal packets to a homeless shelter in Ameerpet.', city: 'Hyderabad', region: 'Telangana', type: 'deed' },
  { title: 'Taught kids at orphanage', description: 'Spent 3 hours teaching English and Math to children at local orphanage.', city: 'Mumbai', region: 'Maharashtra', type: 'deed' },
  { title: 'Planted trees in neighborhood', description: 'Planted 15 saplings along the main road. Also arranged for regular watering with residents.', city: 'Bangalore', region: 'Karnataka', type: 'deed' },
  { title: 'Helped stray animals', description: 'Took 3 injured stray dogs to the vet for treatment and vaccination.', city: 'Chennai', region: 'Tamil Nadu', type: 'deed' },
  { title: 'Blood donation camp', description: 'Organized a blood donation camp in our colony. 25 units collected!', city: 'Delhi', region: 'Delhi', type: 'deed' },
  { title: 'Free tuition for students', description: 'Started free evening tuition classes for underprivileged students in the area.', city: 'Pune', region: 'Maharashtra', type: 'deed' },
  { title: 'Helped flood victims', description: 'Distributed relief materials to families affected by recent flooding.', city: 'Kochi', region: 'Kerala', type: 'deed' },
  { title: 'Fixed broken street light', description: 'Reported and followed up on 5 broken street lights. All fixed within a week.', city: 'Kolkata', region: 'West Bengal', type: 'deed' },
  // Issues
  { title: 'Pothole on main road needs fixing', description: 'Large pothole near Jubilee Hills junction causing accidents. Needs immediate repair.', city: 'Hyderabad', region: 'Telangana', type: 'issue' },
  { title: 'Stray dogs need vaccination', description: 'Group of stray dogs near the park need vaccination and neutering.', city: 'Mumbai', region: 'Maharashtra', type: 'issue' },
  { title: 'Garbage piling up near school', description: 'Garbage not being collected near Government School for past 2 weeks.', city: 'Bangalore', region: 'Karnataka', type: 'issue' },
  { title: 'Broken bench in public park', description: 'The bench near the fountain in the main park is broken. Seniors need it.', city: 'Chennai', region: 'Tamil Nadu', type: 'issue' },
  { title: 'Street light out for weeks', description: 'Street light near the bus stop has been off for 3 weeks. Very unsafe at night.', city: 'Delhi', region: 'Delhi', type: 'issue' },
];

const CITY_COORDS = {
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
};

async function seedData() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear previous dummy data and re-seed
    const existingDummy = await User.findOne({ email: 'rahul@example.com' });
    if (existingDummy) {
      console.log('Clearing previous dummy data...');
      const dummyPhones = DUMMY_USERS.map(u => u.phone);
      const dummyUsers = await User.find({ phone: { $in: dummyPhones } });
      const dummyUserIds = dummyUsers.map(u => u._id);
      await Submission.deleteMany({ userId: { $in: dummyUserIds } });
      await LiveStream.deleteMany({ userId: { $in: dummyUserIds } });
      await User.deleteMany({ phone: { $in: dummyPhones } });
      console.log('Cleared previous dummy data.');
    }

    // Create users
    const users = await User.insertMany(DUMMY_USERS);
    console.log(`Created ${users.length} dummy users`);

    // Create submissions
    const submissions = [];
    const now = new Date();

    for (let i = 0; i < SUBMISSION_TEMPLATES.length; i++) {
      const tmpl = SUBMISSION_TEMPLATES[i];
      const user = users[i % users.length];
      const coords = CITY_COORDS[tmpl.city] || CITY_COORDS.Hyderabad;

      const variations = [
        { latOff: 0.02, lngOff: 0.03 },
        { latOff: -0.03, lngOff: 0.02 },
        { latOff: 0.04, lngOff: -0.02 },
      ];

      for (let v = 0; v < variations.length; v++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date(now.getTime() - daysAgo * 86400000);
        const karmaPoints = [10, 20, 30, 40, 50][Math.floor(Math.random() * 5)];

        submissions.push({
          userId: users[(i + v) % users.length]._id,
          title: tmpl.title + (v > 0 ? ` (${v + 1})` : ''),
          description: tmpl.description,
          submissionType: tmpl.type || 'deed',
          images: [],
          imageUrl: `https://picsum.photos/seed/${i * 3 + v + 1}/400/300`,
          location: {
            type: 'Point',
            coordinates: [
              coords.lng + variations[v].lngOff + (Math.random() - 0.5) * 0.02,
              coords.lat + variations[v].latOff + (Math.random() - 0.5) * 0.02,
            ],
          },
          address: { city: tmpl.city, region: tmpl.region, country: 'India', formattedAddress: `${tmpl.city}, ${tmpl.region}, India` },
          status: 'approved',
          karmaPoints: tmpl.type === 'issue' ? 0 : karmaPoints,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    const insertedSubmissions = await Submission.insertMany(submissions);
    console.log(`Created ${insertedSubmissions.length} dummy submissions (deeds + issues)`);

    // Create linked deed-issue examples (one-to-many: multiple deeds per issue)
    const approvedIssues = insertedSubmissions.filter(s => s.submissionType === 'issue');
    if (approvedIssues.length >= 2) {
      const issue1 = approvedIssues[0];
      // Two different users deed the same issue
      await Submission.create({
        userId: users[1]._id,
        title: `Fixed: ${issue1.title}`,
        description: `Completed the addressed issue by fixing the problem.`,
        submissionType: 'deed',
        linkedIssueId: issue1._id,
        location: issue1.location,
        address: issue1.address,
        status: 'approved',
        karmaPoints: 30,
        createdAt: new Date(now.getTime() - 2 * 86400000),
      });
      await Submission.create({
        userId: users[2]._id,
        title: `Also helped: ${issue1.title}`,
        description: `Contributed additional help to resolve this issue.`,
        submissionType: 'deed',
        linkedIssueId: issue1._id,
        location: issue1.location,
        address: issue1.address,
        status: 'approved',
        karmaPoints: 20,
        createdAt: new Date(now.getTime() - 1.5 * 86400000),
      });
      // A pending deed for same issue
      await Submission.create({
        userId: users[4]._id,
        title: `Helping with: ${issue1.title}`,
        description: `I also helped with this issue, awaiting review.`,
        submissionType: 'deed',
        linkedIssueId: issue1._id,
        location: issue1.location,
        address: issue1.address,
        status: 'pending',
        karmaPoints: 0,
        createdAt: new Date(now.getTime() - 0.5 * 86400000),
      });

      // Issue 2: self-deed (addressed and deed by same user)
      const issue2 = approvedIssues[1];
      await Submission.create({
        userId: issue2.userId,
        title: `Resolved: ${issue2.title}`,
        description: `Addressed and resolved the issue myself.`,
        submissionType: 'deed',
        linkedIssueId: issue2._id,
        location: issue2.location,
        address: issue2.address,
        status: 'approved',
        karmaPoints: 25,
        createdAt: new Date(now.getTime() - 1 * 86400000),
      });
      console.log('Created 4 linked deed-issue examples (multiple deeds per issue)');
    }

    // Create livestream requests
    const streams = [];
    const streamStatuses = ['requested', 'approved', 'ended', 'rejected'];
    for (let i = 0; i < 4; i++) {
      const user = users[i];
      const daysFromNow = i * 3 + 2;
      const from = new Date(now.getTime() + daysFromNow * 86400000);
      from.setHours(10, 0, 0, 0);
      const to = new Date(from.getTime() + 2 * 3600000);

      streams.push({
        userId: user._id,
        title: [`Community Cleanup Drive`, `Teaching Session Live`, `Health Tips Session`, `Neighbourhood Watch`][i],
        description: `Live stream session ${i + 1}`,
        streamType: 'user',
        status: streamStatuses[i],
        scheduledFrom: from,
        scheduledTo: to,
        scheduledAt: from,
        createdAt: new Date(now.getTime() - (i + 1) * 86400000),
      });
    }

    await LiveStream.insertMany(streams);
    console.log(`Created ${streams.length} dummy livestream requests`);

    console.log('\nDummy data seeded successfully!');
    console.log('Dummy users created with phones: +919876543210 through +919876543219');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedData();
