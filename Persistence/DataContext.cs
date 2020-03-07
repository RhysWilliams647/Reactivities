﻿using Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Persistence
{
    public class DataContext: IdentityDbContext<AppUser>
    {
        public DataContext(DbContextOptions options) : base(options)
        {

        }

        public DbSet<Activity> Activities {get; set;}

        public DbSet<Comment> Comment { get; set; }

        public DbSet<UserActivity> UserActivities { get; set; }

        public DbSet<Photo> Photos { get; set; }

        public DbSet<Value> Values {get; set;}

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Value>()
                .HasData(
                    new Value{Id = 1, Name = "Value 101"},
                    new Value{Id = 2, Name = "Value 102"},
                    new Value{Id = 3, Name = "Value 103"}
                );

                builder.Entity<UserActivity>().HasKey(k => new { k.AppUserId, k.ActivityId });
                builder.Entity<UserActivity>()
                    .HasOne(u => u.AppUser)
                    .WithMany(a => a.UserActivities)
                    .HasForeignKey(u => u.AppUserId);
                builder.Entity<UserActivity>()
                    .HasOne(a => a.Activity)
                    .WithMany(a => a.UserActivities)
                    .HasForeignKey(a => a.ActivityId);
        }
    }
}
