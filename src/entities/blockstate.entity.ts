import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('blockstate')
export class BlockState {
  @PrimaryColumn()
  id: string = 'latest';

  @Column('bigint')
  lastProcessedBlock: string;
}
