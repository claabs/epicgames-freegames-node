import rawRequest, { Got, ExtendOptions } from 'got';
import L from '../../src/common/logger';

interface MessageWarning {
  details: string;
}

interface AttachmentSummary {
  fileName: string;
  contentId: string;
  id: string;
  url: string;
}

interface Header {
  name: string;
  value: string;
}

interface MessageEntitySummary {
  id: string;
  headers: Header[];
  childParts: MessageEntitySummary[];
  name: string;
  messageId: string;
  contentId: string;
  attachments: AttachmentSummary[];
  warnings: MessageWarning[];
  size: number;
  isAttachment: boolean;
}

interface Message {
  id: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  receivedDate: Date;
  subject: string;
  parts: MessageEntitySummary[];
  headers: Header[];
  mimeParseError: string;
  relayError: string;
  secureConnection: boolean;
}

interface MessageSummary {
  id: string;
  from: string;
  to: string;
  receivedDate: Date;
  subject: string;
  attachmentCount: number;
  isUnread: boolean;
}

interface Smtp4DevProps {
  pollInterval?: number;
  timeout?: number;
  apiBaseUrl: string;
  requestExtensions?: Got | ExtendOptions;
}

// https://github.com/rnwood/smtp4dev/tree/master/Rnwood.Smtp4dev/ClientApp/src/ApiClient
export default class Smtp4Dev {
  private request: Got;

  private pollInterval: number;

  private timeout: number;

  private apiBaseUrl: string;

  constructor(props: Smtp4DevProps) {
    this.apiBaseUrl = `${props.apiBaseUrl}/api`;
    this.pollInterval = props.pollInterval || 5000;
    this.timeout = props.timeout || 60000;
    this.request = rawRequest.extend({
      responseType: 'json',
      ...props.requestExtensions,
    });
  }

  public async getMessages(): Promise<MessageSummary[]> {
    const resp = await this.request.get<MessageSummary[]>(`${this.apiBaseUrl}/Messages`);
    return resp.body;
  }

  public async getMessage(id: string): Promise<Message> {
    const resp = await this.request.get<Message>(`${this.apiBaseUrl}/Messages/${id}`);
    return resp.body;
  }

  public async getMessageSource(id: string): Promise<string> {
    const resp = await this.request.get(`${this.apiBaseUrl}/Messages/${id}/source`, {
      responseType: 'text',
    });
    return resp.body;
  }

  public async findNewEmailTo(searchString: string): Promise<MessageSummary> {
    const lowerSearchString = searchString.toLowerCase();
    L.debug('Finding new message to:', { searchString: lowerSearchString });
    const startTime = new Date();
    do {
      // eslint-disable-next-line no-await-in-loop
      const messages = await this.getMessages();
      const foundMessage = messages.find(
        m => new Date(m.receivedDate) > startTime && m.to.toLowerCase().includes(lowerSearchString)
      );
      if (foundMessage) {
        L.info('Found message', { lowerSearchString });
        return foundMessage;
      }
      L.trace('No message found, waiting...');
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    } while (startTime.getTime() + this.timeout > Date.now());
    throw new Error(`Timed out after ${this.timeout} ms looking for email`);
  }
}
