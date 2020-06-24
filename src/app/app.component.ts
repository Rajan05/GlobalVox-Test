import { Component, OnInit } from '@angular/core';
import moment from 'moment-timezone';
import { NgbDatepickerConfig, NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";
import { ToastrService } from 'ngx-toastr';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'GlobalVox-Test';
  isHindi: boolean;
  todayDate;
  listOfMeetingTimeZoneWise = [];
  listOfMeeting = [];
  isShowMeetingData: boolean;
  timeZone: any;
  timeZoneList: Object;
  fieldName;
  isDataAvailable = false;
  now = new Date();
  stime;
  etime;
  name;
  meetingDate: NgbDateStruct;
  secretKey = "Meeting";
  isEmptyMeetingList;
  isSpinner = false;

  constructor(private config: NgbDatepickerConfig,private toastr: ToastrService) {
    config.minDate = {
      year: this.now.getFullYear(),
      month: this.now.getMonth() + 1,
      day: this.now.getDate()
    };
    
    config.maxDate = { year: 2099, month: 12, day: 31 };
  }

  ngOnInit(): void {
    this.stime = { hour: this.now.getHours(), minute: this.now.getMinutes() };
    this.etime = { hour: this.now.getHours() + 1, minute: this.now.getMinutes() };
    this.meetingDate = { year: this.now.getFullYear(), month: this.now.getMonth() + 1, day: this.now.getDate() }; 
    this.todayDate = new Date().getDate();
    this.timeZoneList = moment.tz.names();
    this.timeZone = this.timeZoneList[0];
    this.isDataAvailable = true;
    if (document.location.href.includes("/hi")) {
      this.isHindi = true;
    } else {
      this.isHindi = false;
    }
  }

  updateLanguage() {
    if (document.location.href.includes("/hi")) {
      document.location.href = "/";
      this.isHindi = false;
    } else {
      document.location.href = "/hi";
      this.isHindi = true;
    }
  }

  updateTimeZone(timeZone) {
    this.timeZone = timeZone;
    this.getMeetingData();
  }

  compareTime(startTime, endTime, startTimeAdded, endTimeAdded) {
    let convertStartTime = (startTime.hour * 100) + startTime.minute;
    let convertEndTime = (endTime.hour * 100) + endTime.minute;
    let convertStartTimeAdded = (startTimeAdded.hour * 100) + startTimeAdded.minute;
    let convertEndTimeAdded = (endTimeAdded.hour * 100) + endTimeAdded.minute;
    if ((convertStartTime <= convertStartTimeAdded && convertEndTime >= convertStartTimeAdded) 
        || (convertStartTime <= convertEndTimeAdded && convertEndTime >= convertEndTimeAdded)
        || (convertStartTimeAdded <= convertStartTime && convertEndTimeAdded >= convertEndTime)) {
      return true;
    } else {
      return false;
    }
  }

  addMeeting(data) {
    this.getMeetingData();
    this.isDataAvailable = false;
    if (data.fullName == undefined) {
      this.toastr.error("Please Enter Full Name.");
      this.isDataAvailable = true;
      return;
    }
    if (data.startTime.hour > 24 || data.startTime.minute > 60) {
      this.toastr.error("Please Correct Start Time.");
      this.isDataAvailable = true;
      return;
    }
    if (data.endTime.hour > 24 || data.endTime.minute > 60) {
      this.toastr.error("Please Correct End Time.");
      this.isDataAvailable = true;
      return;
    }
    if (data.startTime.hour > data.endTime.hour) {
      this.toastr.error("Please Correct Time. End time must be greater then Start time");
      this.isDataAvailable = true;
      return;
    }
    if ((data.startTime.hour == data.endTime.hour) && (data.startTime.minute > data.endTime.minute)) {
      this.toastr.error("Please Correct Time. End time must be greater then Start time.");
      this.isDataAvailable = true;
      return;
    }
    let isTimePresent = false;
    if (this.listOfMeetingTimeZoneWise != undefined && this.listOfMeetingTimeZoneWise.length > 0) {
      for (let index = 0; index < this.listOfMeetingTimeZoneWise.length; index++) {
        const element = this.listOfMeetingTimeZoneWise[index];
        if (element.date.year == data.meetingDate.year 
          && element.date.month == data.meetingDate.month
          && element.date.day == data.meetingDate.day) {
            if (this.compareTime(element.startTime,element.endTime,data.startTime,data.endTime)) {
              isTimePresent = true;
            }
        }
      }
      if (isTimePresent) {
        this.toastr.error("Sorry time slot is already booked. Please check view meetings & select different time zone.");
        this.isDataAvailable = true;
        return;
      } else {
        let meetingData = {
          fullName: data.fullName,
          date: data.meetingDate,
          startTime: data.startTime,
          endTime: data.endTime,
          timeZone: this.timeZone
        }
        this.listOfMeeting.push(meetingData);
        localStorage.setItem("meetingData", this.encrypt(JSON.stringify(this.listOfMeeting)));
      }
    } else {
      let meetingData = {
        fullName: data.fullName,
        date: data.meetingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: this.timeZone
      }
      this.listOfMeeting.push(meetingData);
      localStorage.setItem("meetingData", this.encrypt(JSON.stringify(this.listOfMeeting)));
    }
    this.toastr.success("Addition of meeting successful!!!")
    this.isDataAvailable = true;
  }

  getMeetingData() {
    this.isDataAvailable = false;
    if (localStorage.getItem("meetingData") != undefined) {
      this.listOfMeeting = JSON.parse(this.decrypt(localStorage.getItem("meetingData")));
      this.listOfMeetingTimeZoneWise = this.listOfMeeting.filter(meeting => {
        return meeting.timeZone == this.timeZone;
      });
      if (this.listOfMeetingTimeZoneWise.length == 0) {
        this.isEmptyMeetingList = true;
      } else {
        this.isEmptyMeetingList = false;
      }
    } else {
      this.isEmptyMeetingList = true;
    }
    this.isDataAvailable = true;
  }

  encrypt(value : string) : string{
    return CryptoJS.AES.encrypt(value, this.secretKey.trim()).toString();
  }

  decrypt(textToDecrypt : string){
    return CryptoJS.AES.decrypt(textToDecrypt, this.secretKey.trim()).toString(CryptoJS.enc.Utf8);
  }
}
