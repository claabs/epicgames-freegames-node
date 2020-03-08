/* eslint-disable @typescript-eslint/camelcase */
// Inspired by https://github.com/Dobby89/guerrillamail-api
import axios from 'axios';
import waitFor from 'p-wait-for';

interface Email {
  mail_from: string;
  mail_timestamp: number;
  mail_read: number;
  mail_date: string;
  reply_to: string;
  mail_subject: string;
  mail_excerpt: string;
  mail_id: number;
  att: number;
  content_type: string;
  mail_recipient: string;
  source_id: number;
  source_mail_id: number;
  mail_body: string;
  size: number;
}

interface AuthResponse {
  auth: {
    success: boolean;
    error_codes: string[];
  };
}

interface GuerrillaRequest {
  f: string;
  sid_token: string;
}

interface GetEmailAddressRequest {
  f: string;
}

interface GetEmailAddressResponse {
  email_addr: string;
  email_timestamp: number;
  alias: string;
  sid_token: string;
}

interface SetEmailUserRequest extends GetEmailAddressRequest {
  email_user: string;
}

interface SetEmailUserResponse extends AuthResponse, GetEmailAddressResponse {
  alias_error: string;
  site_id: number;
  site: string;
}

interface CheckEmailRequest extends GuerrillaRequest, GuerrillaRequest {
  seq: number;
}

interface EmailListResponse extends AuthResponse {
  list: Email[];
  count: string;
  email: string;
  alias: string;
  ts: number;
  sid_token: string;
  stats: {
    sequence_mail: string;
    created_addresses: number;
    received_emails: string;
    total: string;
    total_per_hour: string;
  };
}

type CheckEmailResponse = EmailListResponse;

interface GetEmailListRequest extends GuerrillaRequest {
  offset: number;
  seq?: string;
}

type GetEmailListResponse = EmailListResponse;

interface FetchEmailRequest extends GuerrillaRequest {
  email_id: number;
}

interface FetchEmailResponse extends Email, AuthResponse {
  ref_mid: string;
  sid_token: string;
}

interface ForgetMeRequest extends GuerrillaRequest {
  email_addr: string;
}

type ForgetMeResponse = boolean;

interface DelEmailRequest extends GuerrillaRequest {
  email_ids: string[];
}

interface DelEmailResponse extends AuthResponse {
  deleted_ids: string[];
}

interface MailConfig {
  username: string;
  pollInterval: number;
}

const BASE_URL = 'https://api.guerrillamail.com/ajax.php';

/**
 * Temp mail client for Guerrilla Mail to create and wait for emails on a fresh account
 * Guerrilla API Docs: https://docs.google.com/document/d/1Qw5KQP1j57BPTDmms5nspe-QAjNEsNg8cQHpAAycYNM/edit?hl=en
 */
export default class TempMail {
  private config: MailConfig;

  private sidToken = '';

  public emailAddress = '';

  private seq = 1; // Set seq to value of welcome email

  private recentEmails: Email[] = [];

  constructor(config?: Partial<MailConfig>) {
    this.config = {
      username: '',
      pollInterval: 20000,
      ...config,
    };
  }

  public async init(): Promise<void> {
    if (this.config.username) {
      await this.setEmailUser();
    }
    await this.getEmailAddress();
  }

  private async areNewEmails(): Promise<boolean> {
    const resp = await this.checkEmail();
    if (resp.list.length > 0) {
      this.recentEmails = resp.list;
      return true;
    }
    return false;
  }

  public async waitForEmails(): Promise<Email[]> {
    await waitFor(this.areNewEmails.bind(this), {
      interval: this.config.pollInterval,
    });
    this.seq += this.recentEmails.length;
    const emails = this.recentEmails;
    this.recentEmails = [];
    return emails;
  }

  private async getEmailAddress(): Promise<GetEmailAddressResponse> {
    const params: GetEmailAddressRequest = {
      f: 'get_email_address',
    };

    const resp = await axios.get<GetEmailAddressResponse>(BASE_URL, { params });

    this.sidToken = resp.data.sid_token;
    this.emailAddress = resp.data.email_addr;
    return resp.data;
  }

  private async setEmailUser(): Promise<SetEmailUserResponse> {
    const params: SetEmailUserRequest = {
      f: 'set_email_user',
      email_user: this.config.username,
    };

    const resp = await axios.get<SetEmailUserResponse>(BASE_URL, { params });
    this.sidToken = resp.data.sid_token;
    this.emailAddress = resp.data.email_addr;
    return resp.data;
  }

  public async checkEmail(seq?: number): Promise<CheckEmailResponse> {
    const params: CheckEmailRequest = {
      f: 'check_email',
      sid_token: this.sidToken,
      seq: seq || this.seq,
    };
    const resp = await axios.get<CheckEmailResponse>(BASE_URL, { params });
    return resp.data;
  }

  public async getEmailList(offset: number, seq?: string): Promise<GetEmailListResponse> {
    const params: GetEmailListRequest = {
      f: 'get_email_list',
      sid_token: this.sidToken,
      offset,
      seq,
    };

    const resp = await axios.get<GetEmailListResponse>(BASE_URL, { params });
    return resp.data;
  }

  public async fetchEmail(email_id: number): Promise<FetchEmailResponse> {
    const params: FetchEmailRequest = {
      f: 'fetch_email',
      sid_token: this.sidToken,
      email_id,
    };

    const resp = await axios.get<FetchEmailResponse>(BASE_URL, { params });
    return resp.data;
  }

  public async forgetMe(): Promise<ForgetMeResponse> {
    const params: ForgetMeRequest = {
      f: 'forget_me',
      sid_token: this.sidToken,
      email_addr: this.emailAddress,
    };

    const resp = await axios.get<ForgetMeResponse>(BASE_URL, { params });
    return resp.data;
  }

  public async delEmail(...email_ids: string[]): Promise<DelEmailResponse> {
    const params: DelEmailRequest = {
      f: 'del_email',
      sid_token: this.sidToken,
      email_ids: [...email_ids],
    };
    const resp = await axios.get<DelEmailResponse>(BASE_URL, { params });
    return resp.data;
  }
}
