import { CarrotquestOptions, CarrotquestMethods, CarrrotquestEventProps, CarrotquestUserProp, Plugin } from '@/types/carrotquest';

const initCarrotquest = (apiKey: CarrotquestOptions['apiKey']): void => {
  if (typeof window.carrotquest === 'undefined') {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.carrotquest.app/api.min.js';
    document.head.appendChild(script);

    window.carrotquest = {};
    window.carrotquestasync = [];
    window.carrotquest.settings = {};

    const methods: CarrotquestMethods[] = [
      'connect', 'track', 'identify', 'auth', 'onReady',
      'addCallback', 'removeCallback', 'trackMessageInteraction'
    ];

    methods.forEach((method) => {
      window.carrotquest[method] = function () {
        window.carrotquestasync.push(method, arguments);
      };
    });
  }

  window.carrotquest.connect(apiKey);
};

const prepareUserProps = (
  props: Record<string, string | boolean | number | null>,
  propsMapping: Record<string, string>,
  operation = 'update_or_create'
): CarrotquestUserProp[] => {
  const defaultPropsMapping: Record<string, string> = {
    email: '$email',
    name: '$name',
    phone: '$phone',
  };

  const mapping = { ...defaultPropsMapping, ...propsMapping };

  return Object.keys(mapping)
    .map((key: string): CarrotquestUserProp | null => {
      if (typeof props[key] === 'undefined') {
        return null;
      }

      return {
        op: operation,
        key: mapping[key],
        value: props[key],
      };
    })
    .filter((prop): prop is CarrotquestUserProp => prop !== null);
};

const prepareEventProps = (
  props: Record<string, string | boolean | number | null> = {},
  propsMapping: Record<string, string>
): CarrrotquestEventProps | null => {
  if (Object.keys(props).length === 0) {
    return null;
  }

  return Object.entries(props).reduce((acc, [key, value]) => {
    const newKey = propsMapping[key];
    if (newKey) {
      acc[newKey] = value;
    }
    return acc;
  }, {} as CarrrotquestEventProps);
};

export default ({ apiKey, userPropsMapping = {}, eventPropsMapping = {}, eventsMapping = {} }: CarrotquestOptions): Plugin => ({
  name: 'carrotquest',

  initialize: (): void => {
    if (apiKey) {
      initCarrotquest(apiKey);
    }
  },

  loaded: (): boolean => typeof window.carrotquest !== 'undefined',

  identify: ({ payload }: {
    payload: {
      userId: string;
      traits: Record<string, string | boolean | number>;
    };
  }): void => {
    const { traits } = payload;
    const preparedProps = prepareUserProps(traits, userPropsMapping);

    if (preparedProps.length > 0) {
      window.carrotquest.identify(preparedProps);
    }
  },

  track: ({ payload }: {
    payload: {
      event: string;
      properties?: Record<string, string | boolean | number>;
    };
  }): void => {
    const { event, properties } = payload;
    const eventName = eventsMapping[event];

    if (eventName) {
      const preparedProps = prepareEventProps(properties, eventPropsMapping);
      window.carrotquest.track(eventName, preparedProps);
    }
  },

  methods: {
    auth: (userId: string, userHash: string): void => {
      window.carrotquest.auth(userId, userHash);
    },

    deleteProps: (props: string[]): void => {
      const normalizedProps = Object.fromEntries(props.map((prop) => [prop, null]));
      const preparedProps = prepareUserProps(normalizedProps, userPropsMapping, 'delete');
      window.carrotquest.identify(preparedProps);
    },
  },
});
