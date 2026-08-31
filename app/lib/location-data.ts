/** Indian states and cities data for the onboarding wizard */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export const CITIES_BY_STATE: Record<IndianState, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kadapa", "Anantapur", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezu", "Ziro", "Bomdila", "Roing", "Mechukha"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Bongaigaon", "Tinsukia", "Dibrugarh"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Arrah", "Bihar Sharif", "Purnia", "Katihar", "Munger"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Korba"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Benaulim", "Cansaulim"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Morbi"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Karnal", "Rohtak", "Sonipat", "Ambala", "Yamunanagar", "Kurukshetra", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Kullu", "Manali", "Dharamshala", "Chamba", "Bilaspur", "Nahan"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Phusro"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangalore", "Belgaum", "Davangere", "Bellary", "Tumkur", "Shimoga", "Udupi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Kannur", "Alappuzha", "Kottayam", "Malappuram"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Navi Mumbai", "Pimpri-Chinchwad"],
  "Manipur": ["Imphal", "Thoubabal", "Lilong", "Mayang Imphal", "Kakching", "Ukhrul"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara", "Williamnagar"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Jeypore", "Angul"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Firozpur", "Kapurthala", "Moga"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Pilani", "Bhilwara", "Alwar", "Sikar"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Soreng", "Jorethang", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Vellore", "Erode", "Thanjavur", "Dindigul"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Ramagundam", "Khammam", "Secunderabad", "Nizamabad", "Peddapalli"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut", "Aligarh", "Moradabad", "Bareilly"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rishikesh", "Kashipur", "Rudrapur", "Kotdwar", "Mussoorie"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Murshidabad", "Malda", "Kharagpur", "Bardhaman", "Darjeeling"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi", "Dwarka", "Rohini", "Saket", "Vasant Kunj"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Sopore", "Rajouri"],
  "Ladakh": ["Leh", "Kargil"],
};

export function getCitiesForState(state: string): string[] {
  return CITIES_BY_STATE[state as IndianState] || [];
}

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export const INTERESTS = [
  { id: "running", emoji: "🏃", label: "Running" },
  { id: "cycling", emoji: "🚴", label: "Cycling" },
  { id: "swimming", emoji: "🏊", label: "Swimming" },
  { id: "hiking", emoji: "🥾", label: "Hiking" },
  { id: "yoga", emoji: "🧘", label: "Yoga" },
  { id: "fitness", emoji: "💪", label: "Fitness" },
  { id: "wellness", emoji: "🌿", label: "Wellness" },
  { id: "music", emoji: "🎵", label: "Music" },
  { id: "food", emoji: "🍽️", label: "Food & Drink" },
  { id: "arts", emoji: "🎨", label: "Arts & Culture" },
  { id: "community", emoji: "🤝", label: "Community" },
  { id: "learning", emoji: "📚", label: "Learning" },
] as const;

export type Interest = (typeof INTERESTS)[number]["id"];

export const EVENT_FORMATS = [
  { id: "in_person", emoji: "📍", label: "In-Person" },
  { id: "online", emoji: "💻", label: "Online" },
  { id: "hybrid", emoji: "🔄", label: "Hybrid" },
] as const;

export type EventFormat = (typeof EVENT_FORMATS)[number]["id"];

export const EVENT_FREQUENCIES = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "occasionally", label: "Occasionally" },
] as const;

export type EventFrequency = (typeof EVENT_FREQUENCIES)[number]["id"];