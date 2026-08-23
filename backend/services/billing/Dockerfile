FROM node

WORKDIR /app


COPY package*.json ./
RUN npm install

COPY ./services/billing/package*.json ./services/billing/
RUN cd services/billing && npm install

COPY services/billing ./services/billing
COPY shared ./shared

WORKDIR /app/services/billing

EXPOSE 8002

CMD [ "npm","start" ]