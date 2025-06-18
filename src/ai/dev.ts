import { config } from 'dotenv';
config();

import '@/ai/flows/generate-twitter-post.ts';
import '@/ai/flows/filter-offensive-language.ts';