import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGO_URL) {
  throw new Error('Please add MONGO_URL to your .env file');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === 'development') {
  
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In prod, it's fine to use a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
