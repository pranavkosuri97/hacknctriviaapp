FROM --platform=linux/amd64 node:current-alpine

WORKDIR /app
# COPY ./src/** ./src/
COPY . .

RUN npm install
RUN npm run build

EXPOSE 80
CMD ["npm", "run", "start"]