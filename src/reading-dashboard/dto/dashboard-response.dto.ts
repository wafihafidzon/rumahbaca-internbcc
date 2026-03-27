import { ApiProperty } from '@nestjs/swagger';

export class DashboardGoalSummaryDto {
  @ApiProperty({ required: false })
  targetEndDate?: string;

  @ApiProperty({ required: false })
  dailyPageGoal?: number;

  @ApiProperty({ required: false })
  pagesPerDayNeeded?: number;

  @ApiProperty({ required: false, enum: ['on_track', 'behind', 'ahead'] })
  status?: 'on_track' | 'behind' | 'ahead';
}

export class DashboardActiveReadingDto {
  @ApiProperty()
  trackerId: string;

  @ApiProperty()
  bookTitle: string;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty({
    required: false,
    nullable: true,
    type: DashboardGoalSummaryDto,
  })
  goalSummary: DashboardGoalSummaryDto | null;
}

export class DashboardStreakCalendarItemDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  pagesRead: number;
}

export class DashboardResponseDto {
  @ApiProperty()
  currentStreak: number;

  @ApiProperty({ enum: ['inactive', 'active', 'frozen'] })
  streakStatus: 'inactive' | 'active' | 'frozen';

  @ApiProperty()
  freezeLeft: number;

  @ApiProperty({ type: [DashboardStreakCalendarItemDto] })
  streakCalendar: DashboardStreakCalendarItemDto[];

  @ApiProperty()
  pagesReadToday: number;

  @ApiProperty()
  pagesReadLast7Days: number;

  @ApiProperty({ type: [DashboardActiveReadingDto] })
  activeReadings: DashboardActiveReadingDto[];

  @ApiProperty()
  completedBooksCount: number;
}
