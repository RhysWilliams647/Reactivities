using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Application.Errors;
using Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Profiles
{
    public class ProfileReader : IProfileReader
    {
        private readonly DataContext _context;
        private readonly IUserAccessor _userAccessor;
        public ProfileReader(DataContext context, IUserAccessor userAccessor)
        {
            _userAccessor = userAccessor;
            _context = context;
        }

        public async Task<Profile> ReadProfile(string username)
        {
            var user = await _context.Users.SingleOrDefaultAsync(p => p.UserName == username);

            if (user == null)
                throw new RestException(HttpStatusCode.NotFound, new { User = "Not Found" });

            var currentUser = await _context.Users.SingleOrDefaultAsync(p => p.UserName == _userAccessor.GetCurrentUsername());

            var profile = new Profile
            {
                Username = user.UserName,
                DisplayName = user.DisplayName,
                Image = user.Photos.FirstOrDefault(x => x.IsMain)?.Url,
                Photos = user.Photos,
                Bio = user.Bio,
                FollowersCount = user.Followers.Count(),
                FollowingCount = user.Followings.Count()
            };

            profile.IsFollowed = currentUser.Followings.Any(f => f.TargetId == user.Id);

            return profile;
        }
    }
}