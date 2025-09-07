import * as cron from 'node-cron';
import { SchedulerConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * 任务调度器类 - 管理定时任务
 */
export class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * 添加定时任务
   * @param taskName 任务名称
   * @param config 调度配置
   * @param taskFunction 要执行的任务函数
   */
  public addTask(
    taskName: string,
    config: SchedulerConfig,
    taskFunction: () => Promise<void> | void
  ): boolean {
    try {
      // 验证cron表达式
      if (!cron.validate(config.cronExpression)) {
        logger.error(`无效的cron表达式: ${config.cronExpression}`);
        return false;
      }

      // 如果任务已存在，先停止它
      if (this.tasks.has(taskName)) {
        this.stopTask(taskName);
      }

      // 包装任务函数，添加错误处理和日志
      const wrappedTask = async () => {
        try {
          logger.info(`开始执行定时任务: ${taskName}`);
          const startTime = Date.now();

          await taskFunction();

          const duration = Date.now() - startTime;
          logger.info(`定时任务 ${taskName} 执行完成，耗时: ${duration}ms`);
        } catch (error) {
          logger.error(`定时任务 ${taskName} 执行失败`, error);
        }
      };

      // 创建定时任务
      const task = cron.schedule(
        config.cronExpression,
        wrappedTask,
        {
          scheduled: false, // 先不启动
          timezone: config.timezone || 'Asia/Shanghai'
        }
      );

      this.tasks.set(taskName, task);

      // 如果配置了立即执行，则先执行一次
      if (config.immediate) {
        logger.info(`立即执行任务: ${taskName}`);
        wrappedTask();
      }

      logger.info(`定时任务 ${taskName} 添加成功，cron: ${config.cronExpression}`);
      return true;
    } catch (error) {
      logger.error(`添加定时任务 ${taskName} 失败`, error);
      return false;
    }
  }

  /**
   * 启动指定任务
   */
  public startTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (!task) {
      logger.error(`任务 ${taskName} 不存在`);
      return false;
    }

    try {
      task.start();
      logger.info(`定时任务 ${taskName} 已启动`);
      return true;
    } catch (error) {
      logger.error(`启动定时任务 ${taskName} 失败`, error);
      return false;
    }
  }

  /**
   * 停止指定任务
   */
  public stopTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (!task) {
      logger.error(`任务 ${taskName} 不存在`);
      return false;
    }

    try {
      task.stop();
      logger.info(`定时任务 ${taskName} 已停止`);
      return true;
    } catch (error) {
      logger.error(`停止定时任务 ${taskName} 失败`, error);
      return false;
    }
  }

  /**
   * 删除指定任务
   */
  public removeTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (!task) {
      logger.error(`任务 ${taskName} 不存在`);
      return false;
    }

    try {
      task.stop();
      this.tasks.delete(taskName);
      logger.info(`定时任务 ${taskName} 已删除`);
      return true;
    } catch (error) {
      logger.error(`删除定时任务 ${taskName} 失败`, error);
      return false;
    }
  }

  /**
   * 启动所有任务
   */
  public startAllTasks(): void {
    logger.info(`启动所有定时任务，共 ${this.tasks.size} 个任务`);

    for (const [taskName, task] of this.tasks) {
      try {
        task.start();
        logger.info(`任务 ${taskName} 已启动`);
      } catch (error) {
        logger.error(`启动任务 ${taskName} 失败`, error);
      }
    }
  }

  /**
   * 停止所有任务
   */
  public stopAllTasks(): void {
    logger.info(`停止所有定时任务，共 ${this.tasks.size} 个任务`);

    for (const [taskName, task] of this.tasks) {
      try {
        task.stop();
        logger.info(`任务 ${taskName} 已停止`);
      } catch (error) {
        logger.error(`停止任务 ${taskName} 失败`, error);
      }
    }
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(taskName: string): 'running' | 'stopped' | 'not_found' {
    const task = this.tasks.get(taskName);
    if (!task) {
      return 'not_found';
    }

    // node-cron 没有直接的状态检查方法，这里通过内部属性判断
    return (task as any).running ? 'running' : 'stopped';
  }

  /**
   * 获取所有任务信息
   */
  public getAllTasksInfo(): Array<{ name: string; status: string }> {
    const tasksInfo: Array<{ name: string; status: string }> = [];

    for (const taskName of this.tasks.keys()) {
      tasksInfo.push({
        name: taskName,
        status: this.getTaskStatus(taskName)
      });
    }

    return tasksInfo;
  }

  /**
   * 清理所有任务
   */
  public cleanup(): void {
    logger.info('清理所有定时任务...');

    for (const [taskName, task] of this.tasks) {
      try {
        task.stop();
        logger.info(`任务 ${taskName} 已清理`);
      } catch (error) {
        logger.error(`清理任务 ${taskName} 失败`, error);
      }
    }

    this.tasks.clear();
    logger.info('所有定时任务清理完成');
  }

  /**
   * 手动执行任务（不影响定时调度）
   */
  public async executeTaskManually(taskName: string, taskFunction: () => Promise<void> | void): Promise<boolean> {
    try {
      logger.info(`手动执行任务: ${taskName}`);
      const startTime = Date.now();

      await taskFunction();

      const duration = Date.now() - startTime;
      logger.info(`手动任务 ${taskName} 执行完成，耗时: ${duration}ms`);
      return true;
    } catch (error) {
      logger.error(`手动任务 ${taskName} 执行失败`, error);
      return false;
    }
  }
}

// 导出单例实例
export const taskScheduler = new TaskScheduler();
