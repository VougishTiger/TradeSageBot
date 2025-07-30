import 'dotenv/config';  
import axios from 'axios';

console.log('Access token:', process.env.TRADIER_ACCESS_TOKEN); 

const API_URL = 'https://api.tradier.com/v1';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${process.env.TRADIER_ACCESS_TOKEN}`,
    Accept: 'application/json',
  },
});

const testTradier = async () => {
  try {
    const response = await axiosInstance.get('/user/profile');
    console.log('✅ Connected to Tradier:', response.data);
  } catch (error) {
    console.error('❌ Failed to connect to Tradier:', error.response?.data || error.message);
  }
};

testTradier();
