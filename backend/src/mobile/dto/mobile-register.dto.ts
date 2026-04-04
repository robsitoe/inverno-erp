import { ApiProperty } from '@nestjs/swagger';

export class MobileRegisterDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  role: 'RESELLER' | 'DRIVER';

  @ApiProperty({ required: false })
  nif?: string;

  @ApiProperty({ required: false })
  attachments?: any;

  @ApiProperty({ required: false })
  companyId?: string;
}
