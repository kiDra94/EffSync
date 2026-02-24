import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('task-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('task-templates')
export class TaskTemplatesController {
  constructor(private readonly taskTemplatesService: TaskTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  create(@Body() createDto: CreateTaskTemplateDto, @Req() req) {
    return this.taskTemplatesService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates (optional filter by creator)' })
  @ApiQuery({ name: 'created_by', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  findAll(@Query('created_by') createdBy: number) {
    return this.taskTemplatesService.findAll(createdBy);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskTemplatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskTemplateDto,
  ) {
    return this.taskTemplatesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 400, description: 'Template has associated tasks' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskTemplatesService.remove(id);
  }
}
