# Use an official Node runtime as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
ENV DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["node", "index.js"]
