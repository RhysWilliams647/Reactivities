using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces;
using AutoMapper;
using Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Activities
{
    public class List
    {
        public class ActivitiesEnvelope
        {
            public List<ActivityDto> Activities { get; set; }

            public int ActivityCount { get; set; }
        }

        public class Query : IRequest<ActivitiesEnvelope>
        {
            public Query(bool isGoing, bool isHost, int? limit = null, int? offset = null, DateTime? startDate = null)
            {
                IsGoing = isGoing;
                IsHost = isHost;
                Limit = limit;
                Offset = offset;
                StartDate = startDate ?? DateTime.Now;
            }

            public bool IsGoing { get; set; }

            public bool IsHost { get; set; }

            public int? Limit { get; set; }

            public int? Offset { get; set; }

            public DateTime? StartDate { get; set; }
        }

        public class Handler : IRequestHandler<Query, ActivitiesEnvelope>
        {
            private readonly DataContext _context;
            private readonly IMapper _mapper;
            private readonly IUserAccessor _userAccessor;
            public Handler(DataContext context, IMapper mapper, IUserAccessor userAccessor)
            {
                _userAccessor = userAccessor;
                _mapper = mapper;
                _context = context;
            }

            public async Task<ActivitiesEnvelope> Handle(Query request, CancellationToken cancellationToken)
            {
                var queryable = _context.Activities
                    .Where(a => a.Date >= request.StartDate)
                    .OrderBy(a => a.Date)
                    .AsQueryable();

                if (request.IsGoing && !request.IsHost)
                    queryable = queryable
                        .Where(a => a.UserActivities.Any(ua => ua.AppUser.UserName == _userAccessor.GetCurrentUsername()));
                else if(request.IsHost && !request.IsGoing)
                    queryable = queryable
                        .Where(a => a.UserActivities.Any(ua => ua.AppUser.UserName == _userAccessor.GetCurrentUsername() && ua.IsHost));
                
                var activities = await queryable
                    .Skip(request.Offset ?? 0)
                    .Take(request.Limit ?? 3)
                    .ToListAsync();

                return new ActivitiesEnvelope
                {
                    Activities = _mapper.Map<List<Activity>, List<ActivityDto>>(activities),
                    ActivityCount = queryable.Count()
                };
            }
        }
    }
}