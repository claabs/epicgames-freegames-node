import z from 'zod';

const configSchema = z.object({
  test: z.url().meta({
    description:
      'If true, provide a remotely accessible web address via localtunnel without the need to port forward or reverse proxy',
    example: true,
    default: false,
    env: 'LOCAL_TUNNEL',
  }),
});

console.log(configSchema.parse({ test: 'http://127.0.0.1:1000/wow' }));
