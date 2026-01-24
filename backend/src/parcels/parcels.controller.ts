import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { FiledPackageHandlersService } from 'src/filed-package-handlers/filed-package-handlers.service';
import { RolesGuard } from 'src/guard/roles.guard';
import { CreateParcelDto, UpdateParcelDto } from './dto/parcels.dto';
import { ParcelShopGuard } from './guard/parcelShop.guard';
import { ParcelsService } from './parcels.service';

@Controller('parcels')
export class ParcelsController {
  constructor(
    private parcelsService: ParcelsService,
    private filedPackageHandlersService: FiledPackageHandlersService,
  ) {}

  // GET /parcels
  @Get()
  @UseGuards(JwtAuthGuard)
  async parcel(
    @Request() req,
    @Query('pickup', new DefaultValuePipe(false), ParseBoolPipe)
    pickup: boolean,
    @Query('shop', new DefaultValuePipe(false), ParseBoolPipe)
    shop: boolean,
    @Query('deliveryArea', new DefaultValuePipe(false), ParseBoolPipe)
    deliveryArea: boolean,
  ) {
    const parcels = await this.parcelsService.parcels(
      {
        where: {
          parcelUserId: req.user.id,
        },
      },
      {
        include: {
          parcelPickUp: pickup,
          shop,
          parcelDeliveryArea: deliveryArea && {
            include: {
              district: {
                include: {
                  division: deliveryArea,
                },
              },
            },
          },
          parcelStatus: true,
        },
      },
    );

    return { data: parcels };
  }

  // GET /parcels/all
  @Get('all')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async allParcel(
    @Query('pickup', new DefaultValuePipe(false), ParseBoolPipe)
    pickup: boolean,
    @Query('shop', new DefaultValuePipe(false), ParseBoolPipe)
    shop: boolean,
    @Query('deliveryArea', new DefaultValuePipe(false), ParseBoolPipe)
    deliveryArea: boolean,
    @Query('parcelUser', new DefaultValuePipe(false), ParseBoolPipe)
    parcelUser: boolean,
  ) {
    const parcels = await this.parcelsService.parcels(
      {},
      {
        include: {
          parcelPickUp: pickup && {
            include: {
              area: true,
            },
          },
          shop,
          parcelUser: parcelUser,
          parcelDeliveryArea: deliveryArea && {
            include: {
              district: {
                include: {
                  division: deliveryArea,
                },
              },
            },
          },
          parcelStatus: true,
        },
      },
    );

    return { data: parcels };
  }

  // GET /parcels/pricing
  // Get all parcel pricing
  @Get('pricing')
  async parcelPricing(
    @Query('district', new DefaultValuePipe(false), ParseBoolPipe)
    district: boolean,
  ) {
    const prices = await this.parcelsService.parcelPricing(
      {},
      {
        include: {
          areas: {
            include: {
              district,
            },
          },
          pricing: true,
        },
      },
    );
    return { data: prices };
  }

  // GET /parcels/1
  @Get(':parcelNumber')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async parcelByNumber(
    @Query('pickup', new DefaultValuePipe(false), ParseBoolPipe)
    pickup: boolean,
    @Query('shop', new DefaultValuePipe(false), ParseBoolPipe)
    shop: boolean,
    @Query('deliveryArea', new DefaultValuePipe(false), ParseBoolPipe)
    deliveryArea: boolean,
    @Query('parcelUser', new DefaultValuePipe(false), ParseBoolPipe)
    parcelUser: boolean,
    @Param('parcelNumber') parcelNumber: string,
  ) {
    const parcels = await this.parcelsService.parcel(
      { parcelNumber },
      {
        include: {
          parcelPickUp: pickup && {
            include: {
              area: true,
            },
          },
          shop,
          parcelUser,
          parcelDeliveryArea: deliveryArea && {
            include: {
              district: {
                include: {
                  division: deliveryArea,
                },
              },
            },
          },
          parcelStatus: true,
        },
      },
    );

    if (!parcels) {
      throw new NotFoundException(
        `Parcel with number ${parcelNumber} not found`,
      );
    }

    return parcels;
  }

  // POST /parcels
  // Create parcel
  @Post()
  @UseGuards(JwtAuthGuard, ParcelShopGuard)
  async createParcel(
    @Request() req,
    @Body(ValidationPipe) createParcelDto: CreateParcelDto,
  ) {
    try {
      // extract input data
      const {
        parcelProductCategoriesId,
        shopsId,
        parcelPickUpId,
        parcelStatusId,
        parcelDeliveryAreaId,
        ...restBody
      } = createParcelDto;
      // extract user id from request
      const parcelUserId = req.user.id;

      // Validate parcelStatusId exists
      const parcelStatus = await this.parcelsService.getParcelStatus(parcelStatusId);
      if (!parcelStatus) {
        throw new BadRequestException(`Invalid parcelStatusId: ${parcelStatusId}`);
      }

      // create parcel
      const newParcel = await this.parcelsService.createParcel({
      ...restBody,
      parcelProductCategory: {
        connect: {
          id: parcelProductCategoriesId,
        },
      },
      shop: {
        connect: {
          id: shopsId,
        },
      },
      parcelUser: {
        connect: {
          id: parcelUserId,
        },
      },
      parcelPickUp: {
        connect: {
          id: parcelPickUpId,
        },
      },
      parcelStatus: {
        connect: {
          id: parcelStatusId,
        },
      },
      parcelDeliveryArea: {
        connect: {
          id: parcelDeliveryAreaId,
        },
      },
      ParcelTimeline: {
        create: {
          message: 'The merchant has requested the parcel to be picked up',
          parcelStatusId: parcelStatusId,
        },
      },
    });

      return {
        data: newParcel,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // PATCH /parcels/1
  // Update parcel
  @Patch(':parcelNumber')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateParcel(
    @Param('parcelNumber') parcelNumber: string,
    @Body(ValidationPipe) updateParcelDto: UpdateParcelDto,
  ) {
    try {
      // Validate parcelStatusId if being updated
      if (updateParcelDto.parcelStatusId) {
        const parcelStatus = await this.parcelsService.getParcelStatus(updateParcelDto.parcelStatusId);
        if (!parcelStatus) {
          throw new BadRequestException(`Invalid parcelStatusId: ${updateParcelDto.parcelStatusId}`);
        }
      }

      // Transform the DTO to match Prisma update input
      const data: any = { ...updateParcelDto };
      if (updateParcelDto.parcelStatusId) {
        data.parcelStatus = {
          connect: {
            id: updateParcelDto.parcelStatusId,
          },
        };
        delete data.parcelStatusId;
      }

      const updatedParcel = await this.parcelsService.updateParcel({
        where: {
          parcelNumber,
        },
        data,
      });
      return updatedParcel;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // DELETE /parcels/1
  // Cancel parcel
  @Delete(':parcelNumber')
  @UseGuards(JwtAuthGuard)
  async cancelParcel(
    @Request() req,
    @Param('parcelNumber') parcelNumber: string,
  ) {
    try {
      const parcel = await this.parcelsService.parcel({
        parcelNumber,
      });
      if (!parcel) {
        throw new NotFoundException(
          `Parcel with number ${parcelNumber} not found`,
        );
      }
      if (parcel.parcelUserId !== req.user.id) {
        throw new UnauthorizedException(
          `You are not authorized to cancel this parcel`,
        );
      }
      const updatedParcel = await this.parcelsService.updateParcel({
        where: {
          parcelNumber,
        },
        data: {
          parcelStatus: {
            connect: {
              name: 'cancelled',
            },
          },
          ParcelTimeline: {
            create: {
              message: 'Parcel has been cancelled',
              parcelStatus: {
                connect: {
                  name: 'cancelled',
                },
              },
            },
          },
        },
      });
      return updatedParcel;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // PATCH /parcels?parcelNumber=1&handlerType=deliveryman&handlerId=1
  // Assign parcel to a field package handler
  @Patch()
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async assignParcelFieldPackageHandler(
    @Query('parcelNumber') parcelNumber: string,
    @Query('handlerType') handlerType: string,
    @Query('handlerId', ParseIntPipe) handlerId: number,
  ) {
    try {
      const handlerInfo: any =
        await this.filedPackageHandlersService.fieldPackageHandler(
          {
            id: handlerId,
          },
          {
            include: {
              User: true,
            },
          },
        );
      const message =
        handlerType === 'deliveryman'
          ? `Delivery Agent ${handlerInfo?.User?.name}(${handlerInfo?.User?.phone}) is out for delivery`
          : 'Parcel assigned to a pickupman';

      // Get the appropriate status by name
      const statusName =
        handlerType === 'deliveryman'
          ? 'in_transit'
          : handlerType === 'pickupman'
          ? 'picked_up'
          : 'pending';
      
      const parcelStatus = await this.parcelsService.getParcelStatusByName(statusName);
      if (!parcelStatus) {
        throw new BadRequestException(`Status "${statusName}" not found in database`);
      }

      const result = await this.parcelsService.updateParcel({
        where: {
          parcelNumber,
        },
        data: {
          FieldPackageHandler: {
            connect: {
              id: handlerId,
            },
          },
          ParcelTimeline: {
            create: {
              message,
              parcelStatusId: parcelStatus.id,
            },
          },
          parcelStatus: {
            connect: {
              id: parcelStatus.id,
            },
          },
        },
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // PATCH /parcels/admin/receive
  // Receive parcel
  @Patch('admin/receive/:parcelNumber')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async receiveParcel(@Param('parcelNumber') parcelNumber: string) {
    try {
      // Get the 'pending' status
      const pendingStatus = await this.parcelsService.getParcelStatusByName('pending');
      if (!pendingStatus) {
        throw new BadRequestException('Status "pending" not found in database');
      }

      const result = await this.parcelsService.updateParcel({
        where: {
          parcelNumber,
        },
        data: {
          ParcelTimeline: {
            create: {
              message: 'Parcel has been received by us. We are processing it.',
              parcelStatusId: pendingStatus.id,
            },
          },
          parcelStatus: {
            connect: {
              id: pendingStatus.id,
            },
          },
          FieldPackageHandler: {
            disconnect: true,
          },
        },
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // GET /parcels/packagehandler/to-pickup
  // Get parcels assigned to a pickupman
  @Get('packagehandler/to-pickup')
  @UseGuards(JwtAuthGuard)
  async parcelsAssignedToPickupman(
    @Request() req,
    @Query('pickup', new DefaultValuePipe(false), ParseBoolPipe)
    pickup: boolean,
    @Query('shop', new DefaultValuePipe(false), ParseBoolPipe)
    shop: boolean,
    @Query('deliveryArea', new DefaultValuePipe(false), ParseBoolPipe)
    deliveryArea: boolean,
    @Query('parcelUser', new DefaultValuePipe(false), ParseBoolPipe)
    parcelUser: boolean,
  ) {
    try {
      const pickupmanId = req.user.id;
      // console.log(pickupmanId);
      const parcels = await this.parcelsService.parcels(
        {
          where: {
            AND: [
              {
                FieldPackageHandler: {
                  userId: pickupmanId,
                },
              },
              {
                parcelStatus: {
                  name: 'picked_up',
                },
              },
            ],
          },
        },
        {
          include: {
            parcelPickUp: pickup && {
              include: {
                area: true,
              },
            },
            shop,
            parcelUser: parcelUser,
            parcelDeliveryArea: deliveryArea && {
              include: {
                district: {
                  include: {
                    division: deliveryArea,
                  },
                },
              },
            },
            parcelStatus: true,
          },
        },
      );
      return { data: parcels };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // GET /parcels/packagehandler/to-deliver
  // Get parcels assigned to a deliveryman
  @Get('packagehandler/to-deliver')
  @UseGuards(JwtAuthGuard)
  async parcelsAssignedToDeliveryman(
    @Request() req,
    @Query('pickup', new DefaultValuePipe(false), ParseBoolPipe)
    pickup: boolean,
    @Query('shop', new DefaultValuePipe(false), ParseBoolPipe)
    shop: boolean,
    @Query('deliveryArea', new DefaultValuePipe(false), ParseBoolPipe)
    deliveryArea: boolean,
    @Query('parcelUser', new DefaultValuePipe(false), ParseBoolPipe)
    parcelUser: boolean,
  ) {
    try {
      const deliverymanId = req.user.id;
      const parcels = await this.parcelsService.parcels(
        {
          where: {
            AND: [
              {
                FieldPackageHandler: {
                  userId: deliverymanId,
                },
              },
              {
                parcelStatus: {
                  name: 'in_transit',
                },
              },
            ],
          },
        },
        {
          include: {
            parcelPickUp: pickup && {
              include: {
                area: true,
              },
            },
            shop,
            parcelUser: parcelUser,
            parcelDeliveryArea: deliveryArea && {
              include: {
                district: {
                  include: {
                    division: deliveryArea,
                  },
                },
              },
            },
            parcelStatus: true,
          },
        },
      );
      return { data: parcels };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // GET /parcels/packagehandler/delivered
  // Get parcels delivered by a deliveryman
  @Patch('packagehandler/delivered/:parcelNumber')
  @UseGuards(JwtAuthGuard)
  async parcelsDeliveredByDeliveryman(
    @Param('parcelNumber') parcelNumber: string,
  ) {
    try {
      // Get the 'delivered' status
      const deliveredStatus = await this.parcelsService.getParcelStatusByName('delivered');
      if (!deliveredStatus) {
        throw new BadRequestException('Status "delivered" not found in database');
      }

      const result = await this.parcelsService.updateParcel({
        where: {
          parcelNumber,
        },
        data: {
          ParcelTimeline: {
            create: {
              message:
                'Parcel has been delivered. Thank you for using our service.',
              parcelStatusId: deliveredStatus.id,
            },
          },
          parcelStatus: {
            connect: {
              id: deliveredStatus.id,
            },
          },
          FieldPackageHandler: {
            disconnect: true,
          },
        },
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
