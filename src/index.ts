import { Configuration, OpenAIApi } from 'openai';
import Fastify, { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';

import fastifyEnv from '@fastify/env';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';

const fastify: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL,
  },
});

const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: {
      type: 'string',
      default: 3000,
    },
  },
};

fastify.register(fastifyEnv, {
  confKey: 'config', // optional, default: 'config'
  schema: schema,
  dotenv: true,
});
fastify.register(fastifyStatic, {
  root: '/views',
  prefix: '/views/',
});
fastify.register(fastifyFormbody);
fastify.register(fastifyView, { engine: { pug: require('pug') }, root: 'views' });

const GenerateImage = Type.Object({
  prompt: Type.String(),
  size: Type.String(),
});

type GenerateImageType = Static<typeof GenerateImage>;

fastify.get('/', async (request, reply) => {
  return reply.view('/image');
});

fastify.post<{ Body: GenerateImageType }>('/generate', async (request) => {
  const { prompt, size } = request.body;
  const imageSize = size === 'small' ? '256x256' : size === 'medium' ? '512x512' : '1024x1024';

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createImage({
    prompt,
    n: 1,
    size: imageSize,
  });

  request.log.info(`prompt: ${prompt}
  size: ${size}`);

  return { url: response.data.data[0].url };
});

const main = async () => {
  try {
    await fastify.listen({ port: parseInt(process.env.API_PORT ?? '3000'), host: process.env.API_HOST });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

main();
