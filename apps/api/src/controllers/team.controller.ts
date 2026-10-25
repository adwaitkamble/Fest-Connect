import { Request, Response, NextFunction } from 'express';
import { teamService, TeamService } from '../services/team.service.js';
import { CreateTeamDto, AddMemberDto } from '../types/team.types.js';

export class TeamController {
  constructor(private readonly service: TeamService = teamService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateTeamDto;
      const created = await this.service.createTeam(dto, req.user!);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const team = await this.service.getTeamById(id, req.user!);
      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teams = await this.service.listTeams(req.user!);
      res.status(200).json({
        success: true,
        data: teams,
      });
    } catch (err) {
      next(err);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = parseInt(String(req.params.id), 10);
      const dto = req.body as AddMemberDto;
      const updated = await this.service.addMember(teamId, dto, req.user!);
      res.status(201).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = parseInt(String(req.params.id), 10);
      const participantId = parseInt(String(req.params.participantId), 10);
      const result = await this.service.removeMember(teamId, participantId, req.user!);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const teamController = new TeamController();
